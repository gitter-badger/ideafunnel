# Creates the required forewalls
resource "digitalocean_firewall" "nodes_public_fw" {
  droplet_ids = ["${digitalocean_droplet.node.*.id}"]
  name        = "if-fw-test-${var.uid}"
  tags        = ["${digitalocean_tag.uid_tag.id}", "${digitalocean_tag.whoami_tag.id}", "${digitalocean_tag.phase_tag.id}"]

  inbound_rule = [
    {
      protocol                  = "tcp"
      port_range                = "80"
      source_load_balancer_uids = ["${digitalocean_loadbalancer.loadbalancer.*.id}"]
    },
    {
      protocol         = "tcp"
      port_range       = "22"
      source_addresses = ["0.0.0.0/0", "::/0"]
    },
  ]

  outbound_rule = [
    {
      protocol              = "icmp"
      destination_addresses = ["0.0.0.0/0", "::/0"]
    },
  ]
}
