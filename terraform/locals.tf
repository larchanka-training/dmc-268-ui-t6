locals {
  name = "dmc-268-ui-${var.environment}"

  labels = {
    project     = "dmc-268"
    team        = "6"
    component   = "ui"
    environment = var.environment
    managed_by  = "terraform"
  }

  image_base = "${var.container_registry}/${var.image_repository}"
}
