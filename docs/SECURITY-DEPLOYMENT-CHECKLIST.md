# Security Deployment Checklist

**Purpose:** Ensure every deployment is secure  
**Owner:** Jarvis (Security Officer + Cloud Engineer)  
**When:** Before EVERY deployment to production

---

## ✅ Pre-Deployment Security Checks

### 1. Code Security

- [ ] **No hardcoded secrets**
  ```bash
  grep -r "password\|secret\|api_key\|token" --exclude-dir=node_modules --exclude-dir=.git
  ```

- [ ] **No exposed API keys**
  ```bash
  grep -r "sk_\|pk_\|AIza\|ghp_" --exclude-dir=node_modules --exclude-dir=.git
  ```

- [ ] **Environment variables properly used**
  - Check `.env.example` exists
  - Verify no `.env` in git
  - Confirm all secrets in `.env` not code

- [ ] **Dependencies scanned**
  ```bash
  cd apps/api && pnpm audit
  cd apps/soybean-admin && pnpm audit
  cd apps/web-app && pnpm audit
  ```

### 2. Docker Security

- [ ] **Containers bind to localhost**
  ```bash
  # Check docker-compose.prod.yml
  # All internal services should use: 127.0.0.1:<port>
  grep "ports:" docker-compose.prod.yml
  ```

- [ ] **No privileged containers**
  ```bash
  grep "privileged:" docker-compose.prod.yml
  # Should be empty or false only
  ```

- [ ] **Images from trusted sources**
  - postgres:15-alpine ✅
  - redis:7-alpine ✅
  - node:20-alpine ✅
  - nginx:alpine ✅

- [ ] **No latest tags**
  ```bash
  grep ":latest" docker-compose.prod.yml
  # Should be empty - use specific versions
  ```

### 3. Network Security

- [ ] **Firewall rules correct**
  ```bash
  ssh root@server "ufw status numbered"
  # Only allow: 22, 80, 443, DJ's IP for 8443
  ```

- [ ] **No new public ports**
  ```bash
  ssh root@server "ss -tuln | grep LISTEN | grep -v 127.0.0.1"
  # Should only show: 22, 80, 443
  ```

- [ ] **SSL certificates valid**
  ```bash
  echo | openssl s_client -connect admin.xseo.me:443 2>/dev/null | openssl x509 -noout -dates
  echo | openssl s_client -connect game.xseo.me:443 2>/dev/null | openssl x509 -noout -dates
  ```

### 4. Authentication & Access

- [ ] **JWT secret strong**
  ```bash
  # Check .env file
  # JWT_SECRET should be 32+ characters, random
  ```

- [ ] **Database password strong**
  ```bash
  # Check .env file
  # DATABASE_PASSWORD should be 16+ characters, random
  ```

- [ ] **Redis password set** (if exposed externally)
  ```bash
  grep "REDIS_PASSWORD" .env
  ```

### 5. Application Security

- [ ] **CORS properly configured**
  ```typescript
  // Check apps/api/src/main.ts
  // Should only allow admin.xseo.me, game.xseo.me
  ```

- [ ] **Rate limiting enabled**
  ```typescript
  // Check for @Throttle decorators
  // Or global rate limiting middleware
  ```

- [ ] **Input validation on all endpoints**
  ```typescript
  // DTOs should use class-validator
  // @IsString(), @IsNumber(), etc.
  ```

- [ ] **SQL injection protection**
  ```typescript
  // Using TypeORM = protected ✅
  // No raw queries without parameterization
  ```

---

## 🚀 Deployment Process Checks

### 6. Pre-Deploy

- [ ] **Backup database**
  ```bash
  ssh root@server "docker exec minigame-postgres pg_dump -U minigame > /backup/db_$(date +%Y%m%d_%H%M%S).sql"
  ```

- [ ] **Git tag release**
  ```bash
  git tag -a v1.x.x -m "Release version 1.x.x"
  git push origin v1.x.x
  ```

- [ ] **Review changes**
  ```bash
  git diff HEAD~1 HEAD
  # Review all changed files
  ```

### 7. During Deploy

- [ ] **Pull from GitHub (not local push)**
  ```bash
  ssh root@server "cd /opt/minigame && git pull origin main"
  ```

- [ ] **Verify commit hash**
  ```bash
  ssh root@server "cd /opt/minigame && git log -1 --oneline"
  # Should match latest GitHub commit
  ```

- [ ] **Build with no-cache if dependencies changed**
  ```bash
  # If package.json or Dockerfile changed:
  docker compose build --no-cache <service>
  ```

- [ ] **Check build logs for warnings**
  ```bash
  # Review build output
  # No security warnings
  # No deprecated dependencies
  ```

### 8. Post-Deploy

- [ ] **Services started successfully**
  ```bash
  ssh root@server "docker ps | grep minigame"
  # All should be "Up X seconds/minutes"
  ```

- [ ] **No errors in logs**
  ```bash
  ssh root@server "docker logs minigame-api --tail 50"
  ssh root@server "docker logs minigame-admin --tail 50"
  ssh root@server "docker logs minigame-webapp --tail 50"
  # No ERROR or FATAL messages
  ```

- [ ] **Health checks pass**
  ```bash
  curl -f https://game.xseo.me/api/health || echo "FAILED"
  curl -f https://admin.xseo.me || echo "FAILED"
  curl -f https://game.xseo.me || echo "FAILED"
  ```

- [ ] **Database migrations applied**
  ```bash
  ssh root@server "docker exec minigame-api npm run migration:run"
  # Or check logs for "migrations applied"
  ```

---

## 🔍 Post-Deployment Security Validation

### 9. External Security Scan

- [ ] **No sensitive ports exposed**
  ```bash
  nmap -sT 154.26.136.139
  # Should only show: 22, 80, 443
  ```

- [ ] **SSL grade A or better**
  - Visit: https://www.ssllabs.com/ssltest/
  - Test: admin.xseo.me and game.xseo.me
  - Grade should be A or A+

- [ ] **Security headers present**
  ```bash
  curl -I https://admin.xseo.me | grep -E "X-Frame-Options|X-Content-Type-Options|X-XSS-Protection"
  ```

### 10. Monitoring & Alerts

- [ ] **Log rotation working**
  ```bash
  ssh root@server "docker inspect minigame-api | jq '.[0].HostConfig.LogConfig'"
  # Should show max-size and max-file
  ```

- [ ] **Disk space sufficient**
  ```bash
  ssh root@server "df -h"
  # Root partition should have >20% free
  ```

- [ ] **No suspicious processes**
  ```bash
  ssh root@server "ps aux | grep -E 'nc|ncat|socat|telnet' | grep -v grep"
  # Should be empty
  ```

---

## 🚨 Incident Response Checklist

### If Security Issue Detected

1. **Immediate Actions**
   - [ ] Stop affected service: `docker compose stop <service>`
   - [ ] Block suspicious IPs: `ufw deny from <IP>`
   - [ ] Notify DJ immediately
   - [ ] Preserve logs: `docker logs <container> > incident_$(date +%Y%m%d_%H%M%S).log`

2. **Investigation**
   - [ ] Review access logs
   - [ ] Check for unauthorized changes: `aide --check`
   - [ ] Review firewall logs: `grep UFW /var/log/syslog`
   - [ ] Check user login history: `last -f /var/log/wtmp`

3. **Remediation**
   - [ ] Patch vulnerability
   - [ ] Rotate compromised credentials
   - [ ] Restore from backup if needed
   - [ ] Update firewall rules

4. **Post-Incident**
   - [ ] Document incident
   - [ ] Update security measures
   - [ ] Schedule follow-up audit

---

## 📊 Security Metrics to Track

### Monthly Security Report

- **Failed Login Attempts:** (from fail2ban logs)
- **Blocked IPs:** (from fail2ban ban list)
- **Vulnerabilities Found:** (from pnpm audit)
- **Uptime:** (from monitoring)
- **Certificate Expiry:** (days until renewal)
- **Backup Success Rate:** (percentage)
- **Security Incidents:** (count and severity)

---

## 🔄 Automated Security Checks

### Daily (via cron)

```bash
#!/bin/bash
# /opt/security/daily-check.sh

# Check for failed SSH attempts
fail2ban-client status sshd | mail -s "SSH Security Report" admin@example.com

# Check disk space
df -h | grep -E "9[0-9]%|100%" && mail -s "ALERT: Disk Space Critical" admin@example.com

# Check SSL expiry
openssl s_client -connect admin.xseo.me:443 </dev/null 2>/dev/null | \
  openssl x509 -checkend 2592000 && \
  echo "SSL expires in < 30 days" | mail -s "SSL Renewal Needed" admin@example.com
```

### Weekly (run by Jarvis)

```bash
# Dependency audit
cd /opt/minigame/apps/api && pnpm audit --audit-level=moderate

# Docker image scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image minigame-api:latest
```

---

## 📝 Deployment Log Template

**Date:** YYYY-MM-DD HH:MM  
**Deployed By:** Jarvis  
**Commit:** `<hash>`  
**Services Updated:** api / admin / web-app  

**Pre-Deployment Checks:**
- [ ] All checklist items completed
- [ ] Backup created
- [ ] Security scan passed

**Deployment:**
- [ ] Pulled from GitHub
- [ ] Built successfully
- [ ] Services restarted
- [ ] Health checks passed

**Post-Deployment:**
- [ ] No errors in logs
- [ ] Security validation passed
- [ ] Performance acceptable

**Issues:** None / [describe any issues]

**Rollback Plan:** `git reset --hard <previous-commit>`

---

## 🎓 Security Best Practices

### For DJ (Developing with Antigravity)

1. **Never commit secrets**
   - Use `.env` files
   - Add `.env` to `.gitignore`
   - Use `.env.example` for documentation

2. **Keep dependencies updated**
   - Run `pnpm audit` before committing
   - Fix high/critical vulnerabilities immediately

3. **Validate all inputs**
   - Use DTOs with class-validator
   - Sanitize user input
   - Never trust client data

4. **Use parameterized queries**
   - TypeORM handles this automatically
   - Avoid raw SQL when possible

5. **Implement rate limiting**
   - Protect against brute force
   - Prevent DDoS

### For Jarvis (Deploying)

1. **Always use this checklist**
   - No exceptions
   - Document any deviations

2. **Principle of least privilege**
   - Only open necessary ports
   - Restrict access by IP when possible

3. **Defense in depth**
   - Multiple layers of security
   - Assume one layer will fail

4. **Fail securely**
   - If unsure, don't deploy
   - Ask DJ for clarification

5. **Document everything**
   - Keep deployment logs
   - Track security incidents

---

## 🔗 Related Documentation

- [SECURITY-AUDIT-2026-02-01.md](./SECURITY-AUDIT-2026-02-01.md) - Current security status
- [DEPLOYMENT.md](./DEPLOYMENT.md) - General deployment guide
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues

---

**Last Updated:** 2026-02-01  
**Version:** 1.0  
**Status:** Active ✅
