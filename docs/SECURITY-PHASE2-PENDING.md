# Security Phase 2 - Pending Implementation

**Status:** ⏸️ DEFERRED (Awaiting DJ's approval)  
**Created:** 2026-02-01  
**Priority:** Medium (Phase 1 complete, server is now secure)

---

## 📋 Overview

Phase 1 is complete, and the server risk has decreased from 🔴 HIGH RISK to 🟢 LOW RISK.

Phase 2 consists of **optional advanced security measures** that will further enhance security and convenience.

**DJ's Decision:** Deferred for now; will revisit when needed.

---

## 🎯 Phase 2 Todo List (By Priority)

### 1. SSH Key Authentication ⭐⭐⭐ (Recommended)

**Why it's recommended:**
- ✅ More secure (immune to brute-force attacks).
- ✅ More convenient (no need to enter password every time).
- ✅ Simple setup (5-10 minutes).
- ✅ No downsides.

**What are SSH Keys:**
- Your computer has a "key" (private key file).
- The server has a "lock" (public key).
- Key opens lock = Successful login.
- The key is never transmitted, so it cannot be intercepted or cracked.

**Current login method:**
```bash
ssh root@154.26.136.139
# Enter password: Abcd...
```

**New login method (after setup):**
```bash
ssh root@154.26.136.139
# Instant access! No password required.
```

**Setup Steps:**

#### Step 1: Generate keys on DJ's Mac (1 minute)
```bash
# Run in Mac Terminal:
ssh-keygen -t ed25519 -C "dj@minigame"

# You will be asked 3 questions:
# 1. File location -> Press Enter (default)
# 2. Passphrase -> Press Enter (none) or enter a password (recommended)
# 3. Confirm passphrase -> Same as above

# Two files will be generated:
# ~/.ssh/id_ed25519       (Private key - KEEP SECRET!)
# ~/.ssh/id_ed25519.pub   (Public key - can be shared)
```

#### Step 2: Copy public key to the server (1 minute)
```bash
# Method A: Automatic tools (Recommended)
ssh-copy-id root@154.26.136.139
# Enter your password for the last time

# Method B: Manual (if Method A doesn't work)
cat ~/.ssh/id_ed25519.pub | ssh root@154.26.136.139 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

#### Step 3: Test (30 seconds)
```bash
# Test new key login
ssh root@154.26.136.139
# You should enter directly without a password!

# If it works -> Proceed to Step 4
# If it doesn't work -> Contact Jarvis for troubleshooting
```

#### Step 4: (Optional) Disable Password Login (2 minutes)
```bash
# Run on the server:
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# After this, ONLY key-based login is allowed; passwords will no longer work.
```

**Risk Control:**
- ⚠️ Ensure key-based login works before disabling password auth.
- ⚠️ Keep one SSH session open during the transition to prevent lockouts.
- ⚠️ Back up your private key file (`~/.ssh/id_ed25519`) in a safe place.

**Estimated Time:** 10 minutes  
**Difficulty:** ⭐☆☆☆☆ (Very easy)  
**Rollback:** Easy (Re-enable `PasswordAuthentication yes`)

---

### 2. Disable Root SSH Login ⭐⭐ (Optional)

**Why do this:**
- ✅ Hackers don't know the username (`root` is a standard target).
- ✅ Audit logs are clearer (knowing who used `sudo`).
- ⚠️ Adds one extra step (need to use `sudo su` to switch to root).

**Current login method:**
```bash
ssh root@154.26.136.139
# Directly logged in as root
```

**New login method (after setup):**
```bash
ssh djadmin@154.26.136.139
# Login as a regular user

# When root access is needed:
sudo su
# or
sudo <command>
```

**Setup Steps:**

#### Step 1: Create a new admin user (3 minutes)
```bash
# On the server (as root):
adduser djadmin
# Enter password (twice)
# Press Enter for other information

# Add to sudo group (to allow sudo usage)
usermod -aG sudo djadmin

# Add to docker group (to allow docker usage)
usermod -aG docker djadmin
```

#### Step 2: Copy SSH authorized_keys (1 minute)
```bash
# If SSH keys have already been set up:
mkdir -p /home/djadmin/.ssh
cp /root/.ssh/authorized_keys /home/djadmin/.ssh/
chown -R djadmin:djadmin /home/djadmin/.ssh
chmod 700 /home/djadmin/.ssh
chmod 600 /home/djadmin/.ssh/authorized_keys
```

#### Step 3: Test the new user (2 minutes)
```bash
# On your Mac, open a new terminal window:
ssh djadmin@154.26.136.139

# Test sudo:
sudo ls /root
# Enter djadmin's password
# You should see the contents of /root

# Test docker:
docker ps
# You should see the container list

# If everything works -> Proceed to Step 4
# If it doesn't work -> Do NOT close the root session; troubleshoot the issue.
```

#### Step 4: Disable root SSH login (2 minutes)
```bash
# ⚠️ Ensure djadmin can log in and use sudo before doing this!

# On the server (as root):
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH
systemctl restart sshd

# From now on, root cannot log in via SSH.
# You must log in as djadmin and then use sudo su.
```

**DJ's Daily Use:**
```bash
# Login to the server
ssh djadmin@154.26.136.139

# When root privileges are needed:
sudo su
# Enter djadmin's password
# You are now root

# Or run a single command with sudo:
sudo docker ps
sudo systemctl restart nginx
```

**Pros:**
- ✅ Harder for hackers to brute-force (unknown username).
- ✅ Audit trail provided ( `/var/log/auth.log` records who used `sudo`).

**Cons:**
- ⚠️ Extra step required (using `sudo`).
- ⚠️ Need to remember the `djadmin` username and password.

**Estimated Time:** 15-20 minutes  
**Difficulty:** ⭐⭐☆☆☆ (Medium)  
**Rollback:** Easy (Reset `PermitRootLogin yes`)

---

---

### 3. Docker User Namespace ⭐ (Advanced)

**Why do this:**
- ✅ Adds another layer of security (if a container escape occurs, the attacker is a regular user, not root).
- ⚠️ Requires restarting Docker and all containers.
- ⚠️ Some containers may not be compatible.

**What is User Namespace:**

**Current State:**
```
Root inside container (UID=0) = Root on server (UID=0)
↓
Attacker escapes container = Root privileges on server = DANGEROUS!
```

**After Enabling:**
```
Root inside container (UID=0) = User100000 on server (UID=100000)
↓
Attacker escapes container = Regular user on server = Minimal privileges
```

**Setup Steps:**

#### Step 1: Configure Docker (2 minutes)
```bash
# Edit /etc/docker/daemon.json
cat >> /etc/docker/daemon.json <<EOF
{
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
```

#### Step 2: Restart Docker (5 minutes)
```bash
systemctl restart docker

# ⚠️ This will stop all running containers!
```

#### Step 3: Rebuild all containers (10-30 minutes)
```bash
# MiniGame
cd /opt/minigame
docker compose down
docker compose up -d

# n8n
cd /opt/n8n
docker compose down
docker compose up -d

# ERPNext (may take longer)
cd /opt/erpnext-lending
docker compose down
docker compose up -d

# Other containers...
```

#### Step 4: Validate (5 minutes)
```bash
# Check if all containers are running correctly
docker ps

# Test MiniGame
curl https://admin.xseo.me
curl https://game.xseo.me

# Test n8n
curl https://n8n.pxpxxp.com

# If there are issues -> Troubleshoot or rollback.
```

**Risks:**
- ⚠️ May cause volume permission issues.
- ⚠️ Some containers may require `privileged` mode (not compatible with user namespace).
- ⚠️ Requires downtime (restarting all containers).

**Recommendations:**
- 🟡 Not urgent.
- 🟡 Currently, your containers are bound to `localhost`, which lowers risk.
- 🟡 If you proceed, choose a maintenance window.

**Estimated Time:** 30-60 minutes (including troubleshooting)  
**Difficulty:** ⭐⭐⭐⭐☆ (Hard)  
**Rollback:** Medium (Delete `daemon.json` configuration and restart Docker)

---

---

## 📅 Recommended Implementation Order (When DJ is ready)

### Priority 1: SSH Keys (Strongly Recommended)
- ✅ Most useful.
- ✅ Simplest setup.
- ✅ Most secure.
- ✅ Most convenient.

**Suggested timing:** Any time.

---

### Priority 2: Disable Root SSH (As needed)
- 🟡 Useful but not urgent.
- 🟡 Requires adjusting to the new login method.

**Suggested timing:** 
- Once you are comfortable using SSH keys.
- Or if frequent root brute-force attempts are detected.

---

### Priority 3: Docker User Namespace (Advanced)
- 🔵 Nice to have.
- 🔵 More complex.
- 🔵 Requires downtime.

**Suggested timing:**
- During a planned maintenance window.
- When server load is low.
- Or if running untrusted third-party Docker images.

---

## 🔧 Quick Start Guide (For Jarvis)

**When DJ says "Set up SSH keys":**
```
Execute: SECURITY-PHASE2-PENDING.md → Section 1 → Steps
```

**When DJ says "Disable root login":**
```
Execute: SECURITY-PHASE2-PENDING.md → Section 2 → Steps
```

**When DJ says "Enable Docker User Namespace":**
```
Execute: SECURITY-PHASE2-PENDING.md → Section 3 → Steps
```

---

## 📊 Phase 1 vs. Phase 2 Comparison

### Phase 1 (Complete) ✅

**Goal:** Close obvious security vulnerabilities.

**Accomplished:**
- ✅ `fail2ban` (prevents brute-force).
- ✅ Restricted `n8n`/`ERPNext` access to `localhost`.
- ✅ Security headers implemented.
- ✅ Automatic security updates configured.

**Result:** 🔴 HIGH RISK → 🟢 LOW RISK

---

### Phase 2 (Pending) ⏸️

**Goal:** Advanced security hardening and convenience improvements.

**Content:**
- ⏸️ SSH Key Authentication (more secure + more convenient).
- ⏸️ Disable Root SSH (more secure but adds one more step).
- ⏸️ Docker User Namespace (defense in depth).

**Expected Result:** 🟢 LOW RISK → 🔵 MINIMAL RISK

---

## 💰 Time & Cost Estimate

| Task | Time | Difficulty | Downtime | Recommended |
|------|------|------|----------|--------|
| SSH Keys | 10 mins | ⭐☆☆☆☆ | 0 | ⭐⭐⭐⭐⭐ |
| Disable Root SSH | 20 mins | ⭐⭐☆☆☆ | 0 | ⭐⭐⭐☆☆ |
| Docker User NS | 60 mins | ⭐⭐⭐⭐☆ | 5-10 mins | ⭐⭐☆☆☆ |

**Total:** 90 minutes (if all are completed)  
**Recommended:** Only SSH Keys (10 minutes)

---

## 🚨 Important Reminders

**Before performing any Phase 2 operations:**

1. ✅ Confirm Phase 1 is running normally.
2. ✅ Back up your data.
3. ✅ Keep one SSH session open.
4. ✅ Test in a staging environment first (if possible).
5. ✅ Choose off-peak hours.
6. ✅ Notify DJ before starting.

**If issues occur:**
- Every operation has rollback steps.
- Jarvis will remain calm and troubleshoot.
- Worst-case scenario: Restore via 1Panel (port 8443 remains open).

---

## 📝 Status

**Current Status:** ⏸️ DEFERRED  
**Last Updated:** 2026-02-01  
**Next Review:** When DJ requests  
**Owner:** Jarvis (Security Officer)

**DJ's Decision:** Deferred for now; documented for future reference.

---

**This document will be kept on GitHub and can be executed at any time.**

**When DJ is ready, simply say:**
- "Jarvis, set up SSH keys."
- "Jarvis, continue with Phase 2."
- "Jarvis, disable root SSH."

**I'll know exactly what to do!** ✅
