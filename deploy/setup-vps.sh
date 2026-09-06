#!/usr/bin/env bash
# ============================================================
# تثبيت اللعبة على سيرفر Ubuntu/Debian جديد بأمر واحد.
#
#   على السيرفر (كـ root أو بـ sudo):
#     bash setup-vps.sh                       # بدون دومين، خدمة على الـIP
#     bash setup-vps.sh game.example.com      # مع دومين + SSL تلقائي
#
# يثبت Docker، ينزل الكود، ويشغل اللعبة خلف Caddy.
# ============================================================
set -euo pipefail

REPO="${REPO:-https://github.com/m715c/akadhib.git}"
APP_DIR="${APP_DIR:-/opt/akadhib}"
DOMAIN="${1:-}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mخطأ:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "شغّل السكربت كـ root أو بـ sudo"

log "تحديث النظام"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git

if ! command -v docker >/dev/null 2>&1; then
  log "تثبيت Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  log "Docker موجود من قبل"
fi

systemctl enable --now docker

log "جلب الكود"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

if [ -n "$DOMAIN" ]; then
  log "الإعداد بدومين: $DOMAIN (راح ينجلب SSL تلقائياً)"
  # نبدل عنوان الموقع بالـCaddyfile من :80 للدومين
  sed -i "s|^:80 {|$DOMAIN {|" Caddyfile
  grep -q "^$DOMAIN {" Caddyfile || die "ما كدرنا نعدل الـCaddyfile"
else
  log "الإعداد بدون دومين — الخدمة راح تكون على HTTP بالـIP"
fi

log "فتح المنافذ بالجدار الناري"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp  >/dev/null 2>&1 || true
  ufw allow 80/tcp  >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
fi
# بعض المزودين (مثل Oracle Cloud) يحطون قواعد iptables تمنع 80/443
if command -v iptables >/dev/null 2>&1; then
  iptables -I INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null || true
  iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
  command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null 2>&1 || true
fi

log "بناء وتشغيل اللعبة"
docker compose up -d --build

log "انتظار لين تصير جاهزة"
for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo
if curl -fsS http://127.0.0.1/api/health >/dev/null 2>&1; then
  IP="$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo 'IP-السيرفر')"
  printf '\033[1;32m✔ اللعبة شغالة\033[0m\n'
  if [ -n "$DOMAIN" ]; then
    echo "  الرابط: https://$DOMAIN"
    echo "  (تأكد إن سجل DNS من نوع A يشير لـ $IP)"
  else
    echo "  الرابط: http://$IP"
  fi
  echo
  echo "  السجلات:      docker compose -f $APP_DIR/docker-compose.yml logs -f"
  echo "  إعادة تشغيل:  docker compose -f $APP_DIR/docker-compose.yml restart"
  echo "  تحديث:        cd $APP_DIR && git pull && docker compose up -d --build"
else
  die "ما اشتغلت. شوف السجلات: docker compose -f $APP_DIR/docker-compose.yml logs"
fi
