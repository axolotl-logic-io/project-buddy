FROM --platform=$BUILDPLATFORM debian:bookworm-slim AS kernel
ARG KC1_REV=730236dab9843a2b0c80506eecea5564d15d0a42
ARG LINUX_VERSION=5.16.2
RUN apt-get update && apt-get install -y --no-install-recommends \
    bc bison ca-certificates curl flex gcc gcc-arm-linux-gnueabihf kmod libc6-dev libssl-dev make patch xz-utils
WORKDIR /build
RUN curl -fsSLo kc1.tar.gz "https://codeload.github.com/hansemro/kc1-linux/tar.gz/${KC1_REV}" \
    && curl -fsSLo linux.tar.xz "https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-${LINUX_VERSION}.tar.xz" \
    && tar xf kc1.tar.gz && mv "kc1-linux-${KC1_REV}" kc1 \
    && tar xf linux.tar.xz && mv "linux-${LINUX_VERSION}" linux
WORKDIR /build/linux
ENV ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf-
RUN for patch in ../kc1/patches/*.patch; do patch -p1 --batch --forward < "$patch" || exit; done \
    && cp ../kc1/kc1_config .config \
    && scripts/config --enable AUTOFS_FS --enable CGROUP_PIDS --enable SECCOMP_FILTER --enable SWAP --enable ZRAM \
    && make olddefconfig \
    && make -j"$(nproc)" zImage omap4-kc1.dtb modules \
    && make INSTALL_MOD_PATH=/kernel INSTALL_MOD_STRIP=1 modules_install \
    && rm -f /kernel/lib/modules/*/build /kernel/lib/modules/*/source \
    && cat arch/arm/boot/zImage arch/arm/boot/dts/omap4-kc1.dtb > /kernel/zImage

FROM debian:trixie-slim AS kiosk
RUN sed -i 's/^Components: main$/Components: main non-free-firmware/' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates dbus-x11 firefox-esr firmware-ti-connectivity fonts-dejavu-core \
        lightdm lightdm-gtk-greeter matchbox-keyboard network-manager network-manager-gnome \
        openbox lxpolkit procps systemd-sysv systemd-timesyncd systemd-zram-generator tint2 wireless-regdb wpasupplicant \
        xserver-xorg xserver-xorg-input-libinput xserver-xorg-video-fbdev \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin kiosk \
    && systemctl enable lightdm NetworkManager systemd-timesyncd \
    && systemctl set-default graphical.target \
    && truncate -s 0 /etc/machine-id \
    && rm -f /var/lib/systemd/random-seed && ln -sf /etc/machine-id /var/lib/dbus/machine-id
COPY --chmod=0755 rootfs/usr/local/bin/ /usr/local/bin/
COPY rootfs/etc/ /etc/
COPY rootfs/usr/share/xsessions/ /usr/share/xsessions/
COPY --from=kernel /kernel/lib/modules/ /usr/lib/modules/
RUN touch /etc/project-buddy-kiosk

FROM debian:trixie-slim AS busybox
RUN apt-get update && apt-get download busybox-static \
    && dpkg-deb -x busybox-static_*.deb /probe

FROM --platform=$BUILDPLATFORM debian:bookworm-slim AS images
RUN apt-get update && apt-get install -y --no-install-recommends cpio e2fsprogs gzip mkbootimg
COPY --from=kiosk / /rootfs/
COPY --from=kernel /kernel/zImage /build/zImage
COPY --from=busybox /probe/usr/bin/busybox /ramdisk/bin/busybox
COPY --chmod=0755 probe/init /ramdisk/init
WORKDIR /out
RUN mkdir -p /ramdisk/dev /ramdisk/media /ramdisk/proc /ramdisk/sys /ramdisk/root \
    && (cd /ramdisk && find . -print0 | cpio --null --create --format=newc --owner=0:0 | gzip -n) > /build/initramfs.cpio.gz \
    && mkbootimg --header_version 0 --kernel /build/zImage --ramdisk /build/initramfs.cpio.gz \
        --pagesize 4096 --base 0x80000000 --kernel_offset 0x00008000 \
        --ramdisk_offset 0x01000000 --second_offset 0x00f00000 --tags_offset 0x100 \
        --cmdline 'console=ttyS2,115200 console=tty1 mem=512M' -o boot.img \
    && test "$(stat -c %s boot.img)" -le 10485760 \
    && truncate -s 1536M project-buddy-rootfs.ext4 \
    && mke2fs -q -F -t ext4 -L PB_KIOSK -d /rootfs -m 0 project-buddy-rootfs.ext4 \
    && e2fsck -fn project-buddy-rootfs.ext4 \
    && gzip -n project-buddy-rootfs.ext4 \
    && sha256sum boot.img project-buddy-rootfs.ext4.gz > SHA256SUMS

FROM scratch
COPY --from=images /out/ /
