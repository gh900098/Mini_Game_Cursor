#!/bin/bash
#
# Security Monitoring Script for MiniGame Platform
# Purpose: Automated security checks and alerts
# Owner: Jarvis (Security Officer)
# Usage: Run daily via cron or manually
#

set -euo pipefail

# Configuration
SERVER="154.26.136.139"
ALERT_EMAIL="${ALERT_EMAIL:-root}"
LOG_FILE="/var/log/minigame-security-$(date +%Y%m%d).log"
REPORT_FILE="/tmp/security-report-$(date +%Y%m%d).txt"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Severity levels
declare -i CRITICAL_COUNT=0
declare -i WARNING_COUNT=0
declare -i INFO_COUNT=0

# Logging function
log() {
    local level=$1
    shift
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "$LOG_FILE"
}

# Report function
report() {
    local severity=$1
    local check=$2
    local status=$3
    local details=$4
    
    case $severity in
        CRITICAL)
            CRITICAL_COUNT+=1
            echo -e "${RED}[CRITICAL]${NC} $check: $status" | tee -a "$REPORT_FILE"
            ;;
        WARNING)
            WARNING_COUNT+=1
            echo -e "${YELLOW}[WARNING]${NC} $check: $status" | tee -a "$REPORT_FILE"
            ;;
        INFO)
            INFO_COUNT+=1
            echo -e "${GREEN}[INFO]${NC} $check: $status" | tee -a "$REPORT_FILE"
            ;;
    esac
    
    if [ -n "$details" ]; then
        echo "  Details: $details" >> "$REPORT_FILE"
    fi
}

# Check 1: Port Security
check_ports() {
    log "INFO" "Checking port security..."
    
    local exposed_ports=$(ssh root@$SERVER "ss -tuln | grep LISTEN | grep -v 127.0.0.1 | grep -E ':5678|:8080|:8443'" 2>/dev/null || true)
    
    if [ -n "$exposed_ports" ]; then
        report "CRITICAL" "Port Security" "FAIL" "Management ports exposed: $exposed_ports"
    else
        report "INFO" "Port Security" "PASS" "No management ports exposed"
    fi
    
    # Check for unexpected listening ports
    local unexpected=$(ssh root@$SERVER "ss -tuln | grep LISTEN | grep -v 127.0.0.1 | grep -vE ':22|:80|:443'" 2>/dev/null || true)
    
    if [ -n "$unexpected" ]; then
        report "WARNING" "Unexpected Ports" "FOUND" "$unexpected"
    fi
}

# Check 2: Firewall Status
check_firewall() {
    log "INFO" "Checking firewall status..."
    
    local ufw_status=$(ssh root@$SERVER "ufw status" 2>/dev/null | head -1)
    
    if echo "$ufw_status" | grep -q "Status: active"; then
        report "INFO" "Firewall" "PASS" "UFW is active"
    else
        report "CRITICAL" "Firewall" "FAIL" "UFW is not active"
    fi
    
    # Check for overly permissive rules
    local permissive=$(ssh root@$SERVER "ufw status numbered | grep -E 'ALLOW IN.*Anywhere$'" 2>/dev/null | wc -l)
    
    if [ "$permissive" -gt 4 ]; then
        report "WARNING" "Firewall Rules" "REVIEW" "Found $permissive permissive rules"
    fi
}

# Check 3: fail2ban Status
check_fail2ban() {
    log "INFO" "Checking fail2ban status..."
    
    local fail2ban_running=$(ssh root@$SERVER "systemctl is-active fail2ban" 2>/dev/null || echo "inactive")
    
    if [ "$fail2ban_running" = "active" ]; then
        report "INFO" "fail2ban" "PASS" "Service is running"
        
        # Check banned IPs
        local banned=$(ssh root@$SERVER "fail2ban-client status sshd 2>/dev/null | grep 'Currently banned' | awk '{print \$NF}'" || echo "0")
        if [ "$banned" -gt 0 ]; then
            report "INFO" "fail2ban Bans" "ACTIVE" "$banned IPs currently banned"
        fi
    else
        report "CRITICAL" "fail2ban" "FAIL" "Service is not running"
    fi
}

# Check 4: Docker Security
check_docker_security() {
    log "INFO" "Checking Docker security..."
    
    # Check for privileged containers
    local privileged=$(ssh root@$SERVER "docker ps --format '{{.Names}}' | xargs -I {} docker inspect {} | grep -i '\"Privileged\": true'" 2>/dev/null | wc -l)
    
    if [ "$privileged" -gt 0 ]; then
        report "WARNING" "Docker Privileged" "FOUND" "$privileged privileged containers"
    else
        report "INFO" "Docker Privileged" "PASS" "No privileged containers"
    fi
    
    # Check Docker version
    local docker_version=$(ssh root@$SERVER "docker --version | awk '{print \$3}'" 2>/dev/null)
    report "INFO" "Docker Version" "INFO" "Running Docker $docker_version"
}

# Check 5: SSL Certificates
check_ssl_certificates() {
    log "INFO" "Checking SSL certificates..."
    
    for domain in "admin.xseo.me" "game.xseo.me"; do
        local expiry=$(echo | openssl s_client -connect $domain:443 -servername $domain 2>/dev/null | \
            openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        
        if [ -n "$expiry" ]; then
            local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry" +%s)
            local now_epoch=$(date +%s)
            local days_until_expiry=$(( ($expiry_epoch - $now_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -lt 7 ]; then
                report "CRITICAL" "SSL Cert $domain" "EXPIRING" "Expires in $days_until_expiry days"
            elif [ "$days_until_expiry" -lt 30 ]; then
                report "WARNING" "SSL Cert $domain" "RENEW SOON" "Expires in $days_until_expiry days"
            else
                report "INFO" "SSL Cert $domain" "PASS" "Valid for $days_until_expiry days"
            fi
        else
            report "WARNING" "SSL Cert $domain" "CHECK FAILED" "Unable to verify certificate"
        fi
    done
}

# Check 6: Service Health
check_service_health() {
    log "INFO" "Checking service health..."
    
    for container in "minigame-api" "minigame-admin" "minigame-webapp" "minigame-postgres" "minigame-redis"; do
        local status=$(ssh root@$SERVER "docker inspect -f '{{.State.Status}}' $container" 2>/dev/null || echo "not found")
        
        if [ "$status" = "running" ]; then
            report "INFO" "Service $container" "PASS" "Running"
        else
            report "CRITICAL" "Service $container" "FAIL" "Status: $status"
        fi
    done
}

# Check 7: Disk Space
check_disk_space() {
    log "INFO" "Checking disk space..."
    
    local disk_usage=$(ssh root@$SERVER "df -h / | tail -1 | awk '{print \$5}'" 2>/dev/null | tr -d '%')
    
    if [ "$disk_usage" -gt 90 ]; then
        report "CRITICAL" "Disk Space" "CRITICAL" "Usage at ${disk_usage}%"
    elif [ "$disk_usage" -gt 80 ]; then
        report "WARNING" "Disk Space" "HIGH" "Usage at ${disk_usage}%"
    else
        report "INFO" "Disk Space" "PASS" "Usage at ${disk_usage}%"
    fi
}

# Check 8: Failed Login Attempts
check_failed_logins() {
    log "INFO" "Checking failed login attempts..."
    
    local failed_logins=$(ssh root@$SERVER "grep 'Failed password' /var/log/auth.log | tail -20 | wc -l" 2>/dev/null || echo "0")
    
    if [ "$failed_logins" -gt 10 ]; then
        report "WARNING" "Failed Logins" "HIGH" "$failed_logins recent failed attempts"
    else
        report "INFO" "Failed Logins" "NORMAL" "$failed_logins recent failed attempts"
    fi
}

# Check 9: Suspicious Processes
check_suspicious_processes() {
    log "INFO" "Checking for suspicious processes..."
    
    local suspicious=$(ssh root@$SERVER "ps aux | grep -E 'nc|ncat|socat|telnet|cryptominer' | grep -v grep" 2>/dev/null || true)
    
    if [ -n "$suspicious" ]; then
        report "CRITICAL" "Suspicious Process" "FOUND" "$suspicious"
    else
        report "INFO" "Suspicious Process" "PASS" "None detected"
    fi
}

# Check 10: Docker Log Sizes
check_docker_logs() {
    log "INFO" "Checking Docker log sizes..."
    
    local large_logs=$(ssh root@$SERVER "docker ps -q | xargs -I {} docker inspect -f '{{.LogPath}}' {} | xargs ls -lh | awk '\$5 ~ /G/ {print \$NF}'" 2>/dev/null || true)
    
    if [ -n "$large_logs" ]; then
        report "WARNING" "Docker Logs" "LARGE" "Some logs >1GB: $large_logs"
    else
        report "INFO" "Docker Logs" "PASS" "All logs under 1GB"
    fi
}

# Main execution
main() {
    echo "==================================" > "$REPORT_FILE"
    echo "MiniGame Security Monitor Report" >> "$REPORT_FILE"
    echo "Date: $(date)" >> "$REPORT_FILE"
    echo "Server: $SERVER" >> "$REPORT_FILE"
    echo "==================================" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    log "INFO" "Starting security checks..."
    
    check_ports
    check_firewall
    check_fail2ban
    check_docker_security
    check_ssl_certificates
    check_service_health
    check_disk_space
    check_failed_logins
    check_suspicious_processes
    check_docker_logs
    
    echo "" >> "$REPORT_FILE"
    echo "==================================" >> "$REPORT_FILE"
    echo "Summary" >> "$REPORT_FILE"
    echo "==================================" >> "$REPORT_FILE"
    echo "Critical Issues: $CRITICAL_COUNT" >> "$REPORT_FILE"
    echo "Warnings: $WARNING_COUNT" >> "$REPORT_FILE"
    echo "Info: $INFO_COUNT" >> "$REPORT_FILE"
    
    log "INFO" "Security checks completed"
    log "INFO" "Critical: $CRITICAL_COUNT, Warnings: $WARNING_COUNT, Info: $INFO_COUNT"
    
    # Display report
    cat "$REPORT_FILE"
    
    # Send alert if critical issues found
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        log "ALERT" "CRITICAL ISSUES FOUND - Sending alert"
        # In production, send email or notification
        # mail -s "SECURITY ALERT: MiniGame" "$ALERT_EMAIL" < "$REPORT_FILE"
    fi
    
    # Exit with error if critical issues
    if [ "$CRITICAL_COUNT" -gt 0 ]; then
        exit 1
    fi
    
    exit 0
}

# Run main function
main "$@"
