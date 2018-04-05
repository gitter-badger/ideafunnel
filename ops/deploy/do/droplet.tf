// adds the ssh key on digitalocean
// this is create on terminal using > ssh-keygen -t rsa
resource "digitalocean_ssh_key" "default" {
  name       = "${var.key_name}"
  public_key = "${file("${var.pub_key}")}"
}

resource "digitalocean_volume" "mongo" {
  region      = "lon1"
  name        = "mongo-volume"
  size        = 23 #gb
  description = "persistent volume to hold mongo data"
}

data "template_file" "shell-script" {
  template = "${file("scripts/disk.sh")}"
}

data "template_cloudinit_config" "example" {

  gzip = false
  base64_encode = false

  part {
    content_type = "text/x-shellscript"
    content      = "${data.template_file.shell-script.rendered}"
  }

}


resource "digitalocean_droplet" "web" {
  name     = "ifappsrv"
  ssh_keys = ["${digitalocean_ssh_key.default.id}"]
  image = "docker-16-04"
  region   = "lon1"
  size     = "512mb"
  volume_ids = ["${digitalocean_volume.mongo.id}"]
  user_data = "${data.template_cloudinit_config.example.rendered}"

  provisioner "remote-exec" {
    inline = [
      "mkdir /home/ideafunnel >> /home/deployment.log",
    ]
  }

  provisioner "file" {
    source      = "${path.module}/docker-compose.yml"
    destination = "/home/ideafunnel/docker-compose.yml"
  }

  provisioner "file" {
    source      = "${path.module}/scripts/disk.sh"
    destination = "/home/disk.sh"
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update >> /home/deployment.log",
      "apt-get install python-pip -y >> /home/deployment.log",
      "pip install docker-compose >> /home/deployment.log",
      "cd /home/ideafunnel >> /home/deployment.log",
      "docker-compose up -d",
      "/bin/bash ../disk.sh scsi-0DO_Volume_${digitalocean_volume.mongo.name}"
    ]
  }

  connection {
    type        = "ssh"
    user        = "root"
    private_key = "${file("${var.prv_key}")}"
  }
}
