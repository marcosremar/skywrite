#!/bin/bash
# Skywrite VM Setup Script for Alpine Linux

set -e

echo "Setting up Skywrite project on Alpine Linux..."

# Update system
echo "Updating Alpine packages..."
apk update && apk upgrade

# Install required packages
echo "Installing dependencies..."
apk add --no-cache \
    nodejs \
    npm \
    postgresql \
    postgresql-contrib \
    redis \
    chromium \
    git \
    curl \
    wget \
    bash \
    shadow \
    sudo \
    procps \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# Create skywrite user
echo "Creating skywrite user..."
adduser -D -s /bin/bash skywrite
echo "skywrite:skywrite" | chpasswd
adduser skywrite wheel

# Configure PostgreSQL
echo "Configuring PostgreSQL..."
rc-update add postgresql default
rc-service postgresql start
sudo -u postgres createuser -s skywrite
sudo -u postgres createdb -O skywrite skywrite

# Configure Redis
echo "Configuring Redis..."
rc-update add redis default
rc-service redis start

# Switch to skywrite user and setup project
echo "Setting up Skywrite project..."
sudo -u skywrite -H bash << 'EOF'
cd /home/skywrite

# Clone the repository
git clone https://github.com/marcosremar/skywrite.git
cd skywrite

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database
npm run db:seed

# Create environment file
cat > .env << 'EOL'
NODE_ENV=development
DATABASE_URL=postgresql://skywrite:skywrite@localhost:5432/skywrite
NEXTAUTH_SECRET=dev-secret-key-change-in-production
NEXTAUTH_URL=http://localhost:3002
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EOL

echo "Project setup completed!"
EOF

# Create startup script
echo "Creating startup script..."
cat > /etc/init.d/skywrite << 'EOL'
#!/sbin/openrc-run

name="Skywrite Application"
description="Skywrite Next.js Application"
command="/usr/bin/npm"
command_args="run dev"
command_user="skywrite"
command_background="true"
pidfile="/run/skywrite.pid"
directory="/home/skywrite/skywrite"

depend() {
    need postgresql redis
    use net
}

start_pre() {
    ebegin "Starting Skywrite application"
    cd $directory
}
EOL

chmod +x /etc/init.d/skywrite
rc-update add skywrite default

echo "Setup completed! Skywrite will start on boot."
echo "Access the application at: http://localhost:3002"
echo "Database: PostgreSQL on localhost:5432"
echo "Redis: localhost:6379"
