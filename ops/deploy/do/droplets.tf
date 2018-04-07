resource "digitalocean_droplet" "node" {
  count    = "${var.droplet_count}"
  name     = "if-node-test-${var.uid}-${count.index + 1}"
  ssh_keys = ["${digitalocean_ssh_key.remote_key.id}"]
  image    = "docker-16-04"
  region   = "${var.region}"
  size     = "512mb"
  tags     = ["${digitalocean_tag.uid_tag.id}", "${digitalocean_tag.whoami_tag.id}", "${digitalocean_tag.phase_tag.id}"]

  provisioner "remote-exec" {
    inline = [
      "mkdir /home/ideafunnel >> /home/deployment.log",
    ]
  }

  provisioner "file" {
    source      = "${path.module}/../docker-compose.yml"
    destination = "/home/ideafunnel/docker-compose.yml"
  }

  provisioner "remote-exec" {
    inline = [
      "apt-get update >> /home/deployment.log",
      "apt-get install python-pip -y >> /home/deployment.log",
      "pip install docker-compose >> /home/deployment.log",
      "cd /home/ideafunnel >> /home/deployment.log",
      "docker-compose -p if up -d",
    ]
  }

  connection {
    type        = "ssh"
    user        = "root"
    private_key = "${file("${var.prv_key}")}"
  }
}
