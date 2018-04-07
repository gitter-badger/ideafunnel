
# Outputs the node IPs
output "node_ips" {
  value = "${digitalocean_droplet.node.*.ipv4_address}"
}

# Outputs the Node Names
output "node_names" {
  value = "${digitalocean_droplet.node.*.name}"
}

# Outputs the SSH Key ID
output "ssh_key" {
  value = "${digitalocean_ssh_key.remote_key.id}"
}
