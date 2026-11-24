# Project Buddy on Kindle Fire

This development image targets the first-generation Kindle Fire (Otter, also
reported as Blaze by the stock firmware). It boots a Debian armhf kiosk from a
file in shared media or from external USB storage. The session opens the hosted
Project Buddy site in Firefox ESR. The bottom bar provides a link to
Project Buddy, an on-screen keyboard and a Wi-Fi menu. NetworkManager saves
connections in the kiosk filesystem.

The image uses the [KC1 Linux port][kc1] for the display, touch input and
TI WL1271 Wi-Fi. This port uses Linux 5.16.2, which no longer receives security
updates. Use a test account on an isolated network during hardware validation.

## Build the images

Docker needs arm/v7 container support. From the repository root, run:

```sh
docker buildx build --platform linux/arm/v7 \
  --output type=local,dest=/tmp/project-buddy-kindle apps/kindle
cd /tmp/project-buddy-kindle
shasum -a 256 -c SHA256SUMS
```

- `boot.img` contains the kernel, device tree and startup ramdisk.
- `project-buddy-rootfs.ext4.gz` contains the compressed kiosk filesystem. The
  uncompressed image needs 1.5 GiB of external storage.
- `SHA256SUMS` holds the checksums for both images.

## Validate the hardware

1. Charge the tablet and establish a bootloader path that supports loading an
   image into memory. Confirm that a power cycle returns the tablet to Fire OS.
2. Put the compressed filesystem at `ProjectBuddy/kiosk.ext4.gz` in the tablet's
   shared media storage. The first boot unpacks it as `ProjectBuddy/kiosk.ext4`.
   This path requires the stock partition layout. To use external storage,
   prepare a spare USB drive with the uncompressed filesystem instead and
   connect it through a powered USB On-The-Go adapter or hub.
3. Load `boot.img` into memory and check that the Project Buddy session opens.
4. Use the Wi-Fi menu and on-screen keyboard to join a WPA2 personal network.
   Check that it reconnects after reboot and that the site opens over HTTPS.
5. Open the emailed sign-in link in the kiosk browser to test sign-in. Read the
   email on another device and enter the link on the tablet. Open a quest and
   use the keyboard to add text with Quick Add.
6. Power-cycle the tablet and confirm that it still starts Fire OS.

The shared-media method stores the kiosk as a regular file on the stock media
partition. It leaves the boot, recovery and Fire OS partitions intact. Touch,
Wi-Fi, bootloader compatibility and site performance within 512 MB of RAM
still need a test on the Kindle.

[kc1]: https://github.com/hansemro/kc1-linux/tree/v5.16.x
