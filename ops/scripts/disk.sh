#!/bin/bash
DRIVE= $('sudo file /dev/disk/by-id/scsi-0DO_Volume_$1 | tail -c 5')
echo $DRIVE
DEVICE_FS=`blkid -o value -s TYPE /dev/$DRIVE`
if [ "`echo -n $DEVICE_FS`" == "" ] ; then
        mkfs.ext4 /dev/$DRIVE
fi
mkdir -p /mnt/mongo
echo '/dev/$DRIVE /data ext4 defaults 0 0' >> /etc/fstab
mount /mnt/mongo
