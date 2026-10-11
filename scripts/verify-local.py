"""Exercise the running local UI/API/Drishti integration without credentials or hardware.
Usage: scan-service/.venv/Scripts/python.exe scripts/verify-local.py
Creates a temporary prototype profile and scan in the running app.
"""
import io, json, sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
config = dict(line.split('=', 1) for line in (root / 'server/.env').read_text().splitlines() if '=' in line and not line.startswith('#'))
base = f"http://127.0.0.1:{config.get('PORT', '3000')}"

def request(route, body=None):
    data = json.dumps(body).encode() if body is not None else None
    with urlopen(Request(base + route, data=data, headers={'Content-Type': 'application/json'}), timeout=120) as response:
        return json.load(response)

def upload(route, data, filename='tokens.png', mime='image/png', field='image'):
    boundary = 'KasaNidhiVerificationBoundary'
    payload = (f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n').encode() + data + f'\r\n--{boundary}--\r\n'.encode()
    with urlopen(Request(base + route, data=payload, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}), timeout=120) as response:
        return json.load(response)

health = request('/api/health')
assert health['ok'] and health['scanner'], health
print('PASS: backend and scanner health', health['storage'])
for route in ['/', '/drishti', '/v3/mitra.js', '/v3/app-7.js', '/v3/style-4.css']:
    with urlopen(base + route) as response:
        assert response.status == 200 and len(response.read()) > 0
print('PASS: UI assets and Windows SPA route')
profile = request('/api/profiles', {'name': 'Local verification', 'kind': 'Individual', 'environment': 'Home', 'area': 'Test'})
pid = profile['_id']
assert request('/api/profiles/' + pid)['_id'] == pid
image = Image.new('RGB', (640, 480), 'white')
draw = ImageDraw.Draw(image)
for i, color in enumerate(['green', 'blue', 'red', 'yellow', 'purple', 'orange']):
    x, y = 30 + (i % 3) * 200, 30 + (i // 3) * 220
    draw.rectangle((x, y, x + 100, y + 100), fill=color)
buf = io.BytesIO(); image.save(buf, format='PNG')
color_result = upload('/api/scan?profileId=' + pid + '&mode=color', buf.getvalue())
assert color_result['mode'] == 'A-color' and len(color_result['items']) == 6, color_result
assert len({item['category'] for item in color_result['items']}) == 6
assert all(item['action'] and len(item['bbox']) == 4 for item in color_result['items'])
print('PASS: six color tokens -> backend -> Drishti -> guidance')
ai_result = upload('/api/scan?profileId=' + pid + '&mode=ai', buf.getvalue())
assert ai_result['mode'] in ['B-clip', 'B-seg'] and 'items' in ai_result
if ai_result['mode'] == 'B-clip': assert len(ai_result['items']) == 1
print('PASS: real AI inference executes', ai_result['mode'], [(i['category'], i['confidence']) for i in ai_result['items']])
saved = request('/api/scans', {'profileId': pid, 'mode': color_result['mode'], 'items': color_result['items']})
assert saved['_id'] in [s['_id'] for s in request('/api/scans?profileId=' + pid)]
assert request('/api/impact?profileId=' + pid)['totalItems'] == 6
request('/api/corrections', {'profileId': pid, 'predicted': 'General', 'corrected': 'Recyclable', 'confidence': .5})
assert request('/api/guidance/Hazardous?environment=Home')['action']
assert isinstance(request('/api/collectors?category=E-Waste'), list)
pickup = request('/api/pickups', {'profileId': pid, 'collector': 'Verification collector', 'category': 'E-Waste'})
assert pickup['_id'] in [p['_id'] for p in request('/api/pickups?profileId=' + pid)]
print('PASS: scan storage, impact, correction, guidance, collector and pickup APIs')
chat = request('/api/chat', {'profileId': pid, 'messages': [{'role': 'user', 'content': 'How do I dispose of a battery?'}]})
assert chat['reply']
print('PASS: text chat round trip; actual mode:', chat['mode'])
if not config.get('GROQ_API_KEY', '').strip():
    for route, body in [('/api/voice/speak', {'text': 'Test'}), ('/api/voice/transcribe', {})]:
        try: request(route, body)
        except HTTPError as error:
            assert error.code == 503 and 'not configured' in json.load(error)['error']
        else: raise AssertionError('Missing credential must not be reported as successful voice')
    print('PASS: voice reports missing Groq credential honestly (503); live STT/TTS pending key')
try: upload('/api/scan?mode=ai', b'not an image')
except HTTPError as error: assert error.code in (400, 502)
else: raise AssertionError('Invalid image accepted')
print('PASS: invalid image rejected')
print('Browser camera/microphone permissions and physical audio require an interactive check.')
