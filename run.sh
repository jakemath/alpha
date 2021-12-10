#!/bin/bash
cd src
sudo -E docker-compose up -d --build
sudo docker-compose logs -f -t
