output "Public ip" {
  value = "${digitalocean_droplet.web.ipv4_address}"
}

output "Name" {
  value = "${digitalocean_droplet.web.name}"
}

output "SSH Key" {
  value = "${digitalocean_ssh_key.default.id}"
}
/*
output "Mongo volume id " {
  value = "${digitalocean_volume.mongo.id}"
}
*/
