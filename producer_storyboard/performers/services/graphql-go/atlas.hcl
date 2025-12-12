variable "database_url" {
  type    = string
  default = getenv("DATABASE_URL")
}

env "local" {
  src = "file://migrations"
  url = "postgres://postgres:postgres@localhost:5432/storyboard?sslmode=disable"
  dev = "docker://postgres/15/dev"
  migration {
    dir = "file://migrations"
  }
}

env "prod" {
  src = "file://migrations"
  url = var.database_url
  migration {
    dir = "file://migrations"
  }
}
