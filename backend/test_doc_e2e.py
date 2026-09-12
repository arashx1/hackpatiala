import io
import requests

def test_all():
    print("Testing backend health...")
    r_health = requests.get('http://127.0.0.1:8000/health')
    print("Health:", r_health.status_code, r_health.json())

    print("\nTesting /api/document/summarize with text file...")
    text_data = """APPLE INC. Q1 2025 FINANCIAL HIGHLIGHTS
Apple reported all-time record revenue of $124.3 billion for the quarter ended December 28, 2024, up 4% year-over-year. Diluted earnings per share rose 10% to $2.40. Services revenue reached an all-time record of $26.3 billion, driven by over 2.35 billion active devices globally. The company returned $30 billion to shareholders and generated $39.9 billion in operating cash flow."""

    files = {'file': ('apple_q1.txt', io.BytesIO(text_data.encode('utf-8')), 'text/plain')}
    res = requests.post('http://127.0.0.1:8000/api/document/summarize', files=files)
    print("Summarize status code:", res.status_code)
    data = res.json()
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {data}"
    print("Filename:", data.get('filename'))
    print("File type:", data.get('file_type'))
    print("Words:", data.get('word_count'))
    print("Truncated:", data.get('truncated'))
    print("Summary:", data.get('summary'))
    print("Key Fact:", data.get('key_fact'))
    print("Takeaway:", data.get('takeaway'))
    print("Source:", data.get('source'))

    print("\nTesting /api/document/summarize error guards...")
    # Bad file extension
    bad_files = {'file': ('test.exe', io.BytesIO(b'binary data'), 'application/octet-stream')}
    res_bad = requests.post('http://127.0.0.1:8000/api/document/summarize', files=bad_files)
    print("Bad extension status:", res_bad.status_code, res_bad.json())
    assert res_bad.status_code == 400

    # Empty text
    empty_files = {'file': ('empty.txt', io.BytesIO(b'short'), 'text/plain')}
    res_empty = requests.post('http://127.0.0.1:8000/api/document/summarize', files=empty_files)
    print("Unreadable status:", res_empty.status_code, res_empty.json())
    assert res_empty.status_code == 400

    print("\nTesting Vite frontend server on http://127.0.0.1:5173/...")
    r_front = requests.get('http://127.0.0.1:5173/')
    print("Frontend status:", r_front.status_code)
    assert r_front.status_code == 200
    assert 'root' in r_front.text
    print("Frontend verified successfully!")

    print("\nALL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_all()
