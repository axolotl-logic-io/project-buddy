import ts from "typescript";

interface CopyField {
  readonly identifier: string;
  readonly words: number;
  readonly placeholders: readonly string[];
}

interface CopySheetField extends CopyField {
  readonly description: string;
}

const SPACE = /\s+/u;
const PLACEHOLDER_SPACE = /\s+/gu;
const TEMPLATE = /\{\{[^}]+\}\}/gu;
const QUOTES = /"/gu;
const COPY_NAME = /_COPY$/u;

function unwrap(expression: ts.Expression): ts.Expression {
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return unwrap(expression.expression);
  }
  return expression;
}

// Read source rather than import app modules: exporting copy never starts the
// application or needs its environment, database or server-only dependencies.
function copyFields(
  program: ts.Program,
  files: readonly string[],
): CopyField[] {
  const checker = program.getTypeChecker();
  const fields: CopyField[] = [];

  function declaration(node: ts.Node): ts.Declaration | undefined {
    if (ts.isShorthandPropertyAssignment(node.parent)) {
      return checker.getShorthandAssignmentValueSymbol(node.parent)
        ?.valueDeclaration;
    }
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags === ts.SymbolFlags.Alias) {
      symbol = checker.getAliasedSymbol(symbol);
    }
    return symbol?.valueDeclaration;
  }

  function target(expression: ts.Expression): ts.Expression {
    const value = unwrap(expression);
    const found = declaration(value);
    if (
      found &&
      (ts.isVariableDeclaration(found) || ts.isPropertyAssignment(found)) &&
      found.initializer
    ) {
      return target(found.initializer);
    }
    return value;
  }

  function placeholder(expression: ts.Expression): string {
    return `{{${expression.getText().replace(PLACEHOLDER_SPACE, "_")}}}`;
  }

  function returnTexts(body: ts.Block): string[] {
    const results: string[] = [];
    function visit(node: ts.Node): void {
      if (ts.isReturnStatement(node) && node.expression) {
        results.push(...texts(node.expression));
        return;
      }
      ts.forEachChild(node, visit);
    }
    visit(body);
    return results;
  }

  function texts(expression: ts.Expression): string[] {
    const value = unwrap(expression);
    if (ts.isIdentifier(value) && value.text === "undefined") {
      return [];
    }
    if (
      ts.isSatisfiesExpression(expression) &&
      expression.type.kind === ts.SyntaxKind.NeverKeyword
    ) {
      return [];
    }
    if (
      ts.isStringLiteral(value) ||
      ts.isNoSubstitutionTemplateLiteral(value)
    ) {
      return [value.text];
    }
    if (ts.isTemplateExpression(value)) {
      let { text } = value.head;
      for (const span of value.templateSpans) {
        text += placeholder(span.expression) + span.literal.text;
      }
      return [text];
    }
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) {
      if (!ts.isBlock(value.body)) {
        return texts(value.body);
      }
      return returnTexts(value.body);
    }
    const functionDeclaration = declaration(value);
    if (
      functionDeclaration &&
      ts.isFunctionDeclaration(functionDeclaration) &&
      functionDeclaration.body
    ) {
      return returnTexts(functionDeclaration.body);
    }
    if (ts.isArrayLiteralExpression(value)) {
      return [
        value.elements
          .map((element: ts.Expression): string => {
            if (ts.isStringLiteral(element)) {
              return element.text;
            }
            return placeholder(element);
          })
          .join(""),
      ];
    }
    if (ts.isElementAccessExpression(value)) {
      const object = target(value.expression);
      if (ts.isObjectLiteralExpression(object)) {
        return object.properties.flatMap(
          (property: ts.ObjectLiteralElementLike): string[] => {
            if (ts.isPropertyAssignment(property)) {
              return texts(property.initializer);
            }
            throw new Error(`Unsupported copy lookup: ${property.getText()}`);
          },
        );
      }
    }
    if (ts.isCallExpression(value)) {
      // Page titles keep the page's literal words and one word for the shared
      // site name, just like an interpolation in a copy template.
      if (
        ts.isIdentifier(value.expression) &&
        value.expression.text === "pageTitle"
      ) {
        const [page] = value.arguments;
        if (page) {
          return texts(page).map(
            (text: string): string => `${text} · {{SITE_NAME}}`,
          );
        }
      }
      if (
        ts.isPropertyAccessExpression(value.expression) &&
        value.expression.name.text === "join"
      ) {
        const array = target(value.expression.expression);
        const [separator] = value.arguments;
        if (
          ts.isArrayLiteralExpression(array) &&
          separator &&
          ts.isStringLiteral(separator)
        ) {
          return [
            array.elements
              .flatMap((element: ts.Expression): string[] => texts(element))
              .join(separator.text),
          ];
        }
      }
    }
    const resolved = target(value);
    if (resolved !== value) {
      return texts(resolved);
    }
    const found = declaration(value);
    if (found && ts.isParameter(found)) {
      return [placeholder(value)];
    }
    throw new Error(
      `Unsupported copy at ${value.getSourceFile().fileName}: ${value.getText()}`,
    );
  }

  function walk(identifier: string, expression: ts.Expression): void {
    const value = target(expression);
    if (ts.isObjectLiteralExpression(value)) {
      for (const property of value.properties) {
        if (ts.isSpreadAssignment(property)) {
          walk(identifier, property.expression);
        } else if (ts.isShorthandPropertyAssignment(property)) {
          walk(`${identifier}.${property.name.text}`, property.name);
        } else if (ts.isPropertyAssignment(property)) {
          let name = property.name.getText();
          if (ts.isStringLiteral(property.name)) {
            name = property.name.text;
          }
          walk(`${identifier}.${name}`, property.initializer);
        } else {
          throw new Error(`Unsupported copy property: ${property.getText()}`);
        }
      }
      return;
    }
    if (ts.isArrayLiteralExpression(value)) {
      value.elements.forEach((element: ts.Expression, index: number): void => {
        walk(`${identifier}.${index + 1}`, element);
      });
      return;
    }
    const variants = [...new Set(texts(expression))];
    variants.forEach((text: string, index: number): void => {
      let name = identifier;
      if (variants.length > 1) {
        name += `.variant${index + 1}`;
      }
      let words = 0;
      if (text.trim() !== "") {
        words = text.trim().split(SPACE).length;
      }
      const placeholders = [...new Set(text.match(TEMPLATE) ?? [])];
      fields.push({ identifier: name, words, placeholders });
    });
  }

  for (const file of files) {
    const source = program.getSourceFile(file);
    if (!source) {
      throw new Error(`Copy source not found: ${file}`);
    }
    for (const statement of source.statements) {
      if (ts.isVariableStatement(statement)) {
        for (const variable of statement.declarationList.declarations) {
          if (
            ts.isIdentifier(variable.name) &&
            COPY_NAME.test(variable.name.text) &&
            variable.initializer
          ) {
            walk(variable.name.text, variable.initializer);
          }
        }
      }
    }
  }
  return fields.sort((left: CopyField, right: CopyField): number =>
    left.identifier.localeCompare(right.identifier),
  );
}

function copyCsv(fields: readonly CopySheetField[]): string {
  const rows = [
    ["Identifier", "Needed Word Count (Approx)", "Description", "Copy"],
  ];
  for (const field of fields) {
    rows.push([field.identifier, String(field.words), field.description, ""]);
  }
  return csvRows(rows);
}

function csvRows(rows: readonly (readonly string[])[]): string {
  return `${rows.map((row: readonly string[]): string => row.map((cell: string): string => `"${cell.replace(QUOTES, '""')}"`).join(",")).join("\r\n")}\r\n`;
}

export { type CopyField, type CopySheetField, copyCsv, copyFields, csvRows };
