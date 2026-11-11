// The sign-out form's one field: the endpoint of this browser's push
// subscription, which the page fills in when it has JavaScript and the
// browser has one (sign-out-buttons.tsx). signOutAction deletes that
// subscription too, if it is the signed-in user's, in case the browser has
// lost its push_device cookie.
const PUSH_ENDPOINT_FIELD = "pushEndpoint";

export { PUSH_ENDPOINT_FIELD };
