# Skywrite - Windsurf Connection

## 🚀 Quick Connect

### Method 1: Remote SSH Extension
1. Install **Remote SSH** extension in Windsurf
2. Press `Cmd+Shift+P`
3. Type: `Remote-SSH: Connect to Host`
4. Enter: `skywrite`
5. Navigate to: `/app`

### Method 2: Command Line
```bash
# Open directly in Windsurf/VS Code
code --remote ssh-remote+skywrite /app

# Or use the connection script
./connect-windsurf.sh
```

### Method 3: Configuration File
Add to Windsurf SSH config:
```json
{
  "host": "skywrite.orb.local",
  "user": "root", 
  "port": 22,
  "privateKeyPath": "~/.ssh/id_rsa",
  "remotePath": "/app"
}
```

## 🔗 Direct Links

### SSH Connection
```
ssh://root@skywrite.orb.local:22/app
```

### Web Application
```
http://skywrite.orb.local:3002
```

## 📋 Connection Info

- **Host**: `skywrite.orb.local`
- **User**: `root`
- **Password**: No password (SSH key only)
- **Port**: `22`
- **Remote Path**: `/app`
- **Local Path**: `~/Documents/projects/microsass/dumont-writer/thesis-writer`

## 🛠 What's Available

- ✅ **Next.js App** running on port 3002
- ✅ **PostgreSQL** database
- ✅ **Redis** cache
- ✅ **SSH** access
- ✅ **File sync** capabilities

## 🎯 Login Credentials (Web App)

- **Email**: `marcosremar@gmail.com`
- **Password**: `marcos123`

## 🔧 Troubleshooting

If connection fails:
1. Check SSH: `ssh skywrite "whoami"`
2. Check hosts file: `grep skywrite.orb.local /etc/hosts`
3. Restart container: `docker restart skywrite`

## 📁 Project Structure

```
/app/
├── src/           # Next.js source code
├── prisma/        # Database schema
├── public/        # Static files
├── package.json   # Dependencies
└── .env          # Environment variables
```
