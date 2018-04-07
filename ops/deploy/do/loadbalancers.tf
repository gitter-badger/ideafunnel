# Creates the load balancer
resource "digitalocean_loadbalancer" "loadbalancer" {
  count  = "${var.loadbalancer_count}"
  name   = "if-lb-test-${var.uid}-${count.index + 1}"
  region = "${var.region}"

  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"

    target_port     = 80
    target_protocol = "http"
  }

  healthcheck {
    port     = 80
    protocol = "http"
  }

  droplet_ids = ["${digitalocean_droplet.node.*.id}"]
}
