# DNS entry for ideas
resource "digitalocean_record" "ideas" {
  domain = "capco.io"
  type   = "A"
  name   = "ideas"
  count  = "${var.loadbalancer_count}"
  value  = "${digitalocean_loadbalancer.loadbalancer.*.ip[count.index]}"
}
