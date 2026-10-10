#!/usr/bin/env bash
# Calls <domain>/cs/v1/vpn-countries on every domain in policy.json and reports
# which ones answer 200. Exit code is 0 only if all of them do.
#
#   ./scripts/check-policy.sh
#   PROXY_KEY=... ./scripts/check-policy.sh
#   ./scripts/check-policy.sh --path /cs/v1/vpn-countries --timeout 10 --policy policy.json
set -u

POLICY="policy.json"
ENDPOINT="/cs/v1/vpn-countries"
TIMEOUT=15

while [ $# -gt 0 ]; do
	case "$1" in
	--policy) POLICY="${2:?--policy needs a value}"; shift 2 ;;
	--path) ENDPOINT="${2:?--path needs a value}"; shift 2 ;;
	--timeout) TIMEOUT="${2:?--timeout needs seconds}"; shift 2 ;;
	-h | --help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
	*) echo "unknown option: $1" >&2; exit 2 ;;
	esac
done

[ -f "$POLICY" ] || { echo "cannot find $POLICY" >&2; exit 2; }

# policy.json is a flat JSON array of URLs
DOMAINS=()
while IFS= read -r line; do DOMAINS+=("$line"); done < <(grep -oE '"https?://[^"]+"' "$POLICY" | tr -d '"')
[ "${#DOMAINS[@]}" -gt 0 ] || { echo "no domains in $POLICY" >&2; exit 2; }

HEADER=()
[ -n "${PROXY_KEY:-}" ] && HEADER=(-H "x-proxy-key: ${PROXY_KEY}")

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

check() {
	local index="$1" domain="$2" url out
	url="${domain%/}${ENDPOINT}"
	out="$(curl -s -o /dev/null --max-time "$TIMEOUT" ${HEADER[@]+"${HEADER[@]}"} \
		-w '%{http_code} %{size_download} %{time_total}' "$url" 2>/dev/null)"
	[ -n "$out" ] || out="000 0 0"
	echo "$out" >"$TMP/$index"
}

for i in "${!DOMAINS[@]}"; do
	check "$i" "${DOMAINS[$i]}" &
done
wait

echo "GET ${ENDPOINT}${PROXY_KEY:+ (with x-proxy-key)}"
echo

ok_count=0
ok_list=()
for i in "${!DOMAINS[@]}"; do
	read -r status bytes seconds <"$TMP/$i"
	ms="$(awk -v s="$seconds" 'BEGIN { printf "%d", s * 1000 }')"
	if [ "$status" = "200" ]; then
		mark="OK  "
		ok_count=$((ok_count + 1))
		ok_list+=("${DOMAINS[$i]}")
	else
		mark="FAIL"
	fi
	if [ "$status" = "000" ]; then
		detail="no response (timeout or connection error)"
	else
		detail="${status}, ${bytes} bytes"
	fi
	echo "${mark} ${DOMAINS[$i]}  ${detail}  ${ms}ms"
done

echo
echo "${ok_count}/${#DOMAINS[@]} returned 200"
for domain in ${ok_list[@]+"${ok_list[@]}"}; do echo "  ${domain}"; done

[ "$ok_count" -eq "${#DOMAINS[@]}" ]
