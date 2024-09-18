Got it! Here's the `README.md` in English for transferring the project to another account:

````md
# Filmreach Project

This project utilizes Node.js, Nginx, Docker, Redis, and PM2 to run the server application.

## Setup Instructions

### 1. System Update and Git Installation

```bash
sudo yum update
sudo yum install git
git version
```
````

### 2. Install Node.js via NVM

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20.8.0
nvm use 20.8.0
node -v
```

### 3. Install PM2 and Necessary Node Modules

```bash
npm install pm2@latest -g
npm install bull
npm install workerpool
npm install cors
npm install bull ioredis
npm install redis
```

### 4. Nginx Installation and Configuration

```bash
sudo yum update
sudo yum install nginx
```

-   SSL Certificates:

    -   Place your SSL certificates in `/etc/ssl`. The certificates required for the project are:
        -   `filmreach_io.crt`
        -   `filmreach_io.key`
        -   `filmreach_io.ca-bundle.crt`

-   Edit Nginx configuration:

```bash
sudo nano /etc/nginx/nginx.conf
```

-   Test Nginx configuration and restart the service:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Redis Installation

```bash
sudo yum install redis
sudo amazon-linux-extras install redis6
sudo systemctl status redis
```

-   Alternatively, you can use Docker to run Redis:

```bash
sudo yum install docker -y
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo systemctl enable docker

# Run Redis container
sudo docker run -d --name redis -p 6379:6379 redis
sudo docker exec -it redis redis-cli ping
```

### 6. Docker Installation

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io -y
sudo systemctl start docker
sudo systemctl enable docker
docker --version
```

### 7. Running the Project with PM2

```bash
pm2 start server.js --name "server"
pm2 save
```

-   Check PM2 logs and status:

```bash
pm2 logs
pm2 status
```

## Additional Steps

-   If needed, manage disk partitions and monitor disk space:

```bash
sudo fdisk -l
df -h
```

-   Restart the server if necessary:

```bash
pm2 stop server
pm2 start server
```

## SSL Certificates

Make sure to place the SSL certificates for both the main domain (`filmreach.io`) and the API (`api.filmreach.io`) in `/etc/ssl`. For example:

```bash
sudo nano /etc/ssl/filmreach_io.crt
sudo nano /etc/ssl/filmreach_io.key
sudo nano /etc/ssl/filmreach_io.ca-bundle.crt
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

This `README.md` provides clear instructions for setting up the project on a new account or server.
```
