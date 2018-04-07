# uid tag
resource "digitalocean_tag" "uid_tag" {
  name = "if-tag-${var.uid}"
}

# whoami tag
resource "digitalocean_tag" "whoami_tag" {
  name = "if-tag-${var.whoami}"
}

# uid tag
resource "digitalocean_tag" "phase_tag" {
  name = "if-test-test"
}
