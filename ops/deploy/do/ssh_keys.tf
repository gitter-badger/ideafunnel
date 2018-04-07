# Remote temporary key
resource "digitalocean_ssh_key" "remote_key" {
  name       = "if-key-test-${var.key_name}"
  public_key = "${file("${var.pub_key}")}"
}