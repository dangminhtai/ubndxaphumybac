"""Browser acceptance test for real editor interactions; APIs are isolated mocks."""
import copy
import functools
import json
import os
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright
from test_weekly_summary_ui import Handler, DIST, PERIOD


class Pages(Handler):
    def do_GET(self):
        if urlparse(self.path).path in ('/employee-report', '/monthly-report'):
            self.path = '/index.html'
        return super().do_GET()


def main():
    user = dict(_id='a' * 24, id='a' * 24, username='qa', fullName='Chuyên viên kiểm thử', role='staff', fieldCodes=['LV4'], department='Phòng Văn hóa - Xã hội')
    field = dict(code='LV4', title='Y tế', groupId='health', owners=[])
    state = dict(weekly=None, monthly=None)
    errors = []

    def api(route):
        path, method = urlparse(route.request.url).path, route.request.method
        if path == '/api/ready': result = dict(ready=True, phase='ready')
        elif path == '/api/auth/me': result = user
        elif path == '/api/notifications': result = dict(notifications=[], unreadCount=0)
        elif path == '/api/fields': result = [field]
        elif path == '/api/reports/weekly/current': result = dict(period=PERIOD, report=state['weekly'], fields=[field], assignedFieldCodes=['LV4'])
        elif path == '/api/reports/monthly-staff/current': result = dict(period={**PERIOD, 'type': 'monthly'}, report=state['monthly'])
        elif path in ('/api/reports/weekly', '/api/reports/monthly-staff') and method == 'POST':
            key = 'weekly' if path.endswith('/weekly') else 'monthly'
            state[key] = dict(_id='b' * 24, **copy.deepcopy(route.request.post_data_json))
            result = state[key]
        else:
            route.fulfill(status=404, json={'error': path}); return
        route.fulfill(status=200, json=result)

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Pages, directory=str(DIST)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    output = Path(tempfile.gettempdir()) / 'report-rich-text-qa'
    output.mkdir(exist_ok=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('CHROME_BIN', 'C:/Program Files/Google/Chrome/Application/chrome.exe'), headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000})
            page.add_init_script(f"localStorage.setItem('token','fixture'); localStorage.setItem('user',{json.dumps(json.dumps(user))});")
            page.route('**/api/**', api)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/employee-report')
            editor = page.get_by_role('textbox', name='LV4 - 1. Kết quả thực hiện', exact=True)
            editor.wait_for()
            toolbar = page.get_by_role('toolbar', name='Định dạng LV4 - 1. Kết quả thực hiện', exact=True)
            assert toolbar.get_by_role('button').count() == 5
            editor.fill('Kết quả tiếng Việt có dấu')
            editor.press('Control+a')
            toolbar.get_by_role('button', name='In đậm', exact=True).click()
            assert editor.locator('strong').inner_text() == 'Kết quả tiếng Việt có dấu'
            toolbar.get_by_role('button', name='In nghiêng', exact=True).click()
            toolbar.get_by_role('button', name='Gạch chân', exact=True).click()
            assert editor.locator('strong em u, strong u em, em strong u, em u strong, u em strong, u strong em').count() == 1
            editor.press('ArrowRight')
            editor.press('End')
            editor.press('Enter')
            # Clear marks before starting a list; the list is real structured content.
            for name in ['In đậm', 'In nghiêng', 'Gạch chân']:
                button = toolbar.get_by_role('button', name=name, exact=True)
                if button.get_attribute('aria-pressed') == 'true': button.click()
            toolbar.get_by_role('button', name='Danh sách đánh số', exact=True).click()
            page.keyboard.insert_text('Nhiệm vụ thứ nhất')
            page.keyboard.press('Enter')
            page.keyboard.insert_text('Nhiệm vụ thứ hai')
            page.keyboard.press('Enter')
            page.keyboard.insert_text('Nhiệm vụ thứ ba')
            assert editor.locator('ol > li').count() == 3
            assert editor.locator('ol > li').nth(1).inner_text() == 'Nhiệm vụ thứ hai'
            page.keyboard.press('Enter'); page.keyboard.press('Enter')
            page.keyboard.insert_text('Đoạn sau danh sách')
            assert editor.locator('ol > li').count() == 3
            assert editor.locator(':scope > p').last.inner_text() == 'Đoạn sau danh sách'
            # Literal Markdown is literal in the new editor, and another editor is independent.
            tasks = page.get_by_role('textbox', name='LV4 - 2. Phương hướng, nhiệm vụ tuần tới', exact=True)
            tasks.fill('Giữ nguyên **ký hiệu** và 5 < 10 & 20 > 10')
            assert tasks.locator('strong').count() == 0
            page.get_by_role('button', name='Lưu nháp', exact=True).click()
            page.get_by_text('Đã lưu nháp', exact=True).wait_for()
            saved = state['weekly']['fieldReports'][0]
            assert saved['contentFormat'] == 'html-v1' and '<ol>' in saved['content'] and '<strong>' in saved['content']
            assert '&lt;' in saved['nextTasks'] and '**ký hiệu**' in saved['nextTasks']
            page.reload(); editor.wait_for()
            assert editor.locator('ol > li').count() == 3
            assert tasks.inner_text() == 'Giữ nguyên **ký hiệu** và 5 < 10 & 20 > 10'
            page.screenshot(path=str(output / 'weekly-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(output / 'weekly-mobile.png'), full_page=True)
            # HTML paste through the actual ProseMirror clipboard pipeline.
            tasks.evaluate("el => { el.focus(); const data = new DataTransfer(); data.setData('text/html', '<p style=\"color:red\"><strong>Dán từ Word</strong><img src=x onerror=\"window.BAD=1\"><script>window.BAD=1</script></p>'); el.dispatchEvent(new ClipboardEvent('paste', {clipboardData:data, bubbles:true, cancelable:true})); }")
            assert tasks.locator('strong').inner_text() == 'Dán từ Word'
            assert tasks.locator('img,script,[style],[onerror]').count() == 0
            assert not page.evaluate('window.BAD || false')
            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.goto(f'http://127.0.0.1:{server.server_port}/monthly-report')
            monthly = page.get_by_role('textbox', name='Kết quả thực hiện', exact=True)
            monthly.wait_for()
            assert page.get_by_role('toolbar').count() == 4
            monthly.fill('Nội dung tháng mới nhất')
            page.get_by_role('button', name='Lưu nháp', exact=True).click()
            page.get_by_text('Đã lưu nháp vào MongoDB', exact=True).wait_for()
            monthly.fill('Đã sửa sau khi lưu nháp')
            page.get_by_role('button', name='Gửi báo cáo', exact=True).click()
            page.get_by_text('Đã nộp báo cáo vào MongoDB', exact=True).wait_for()
            assert 'Đã sửa sau khi lưu nháp' in state['monthly']['content']
            assert state['monthly']['contentFormat'] == 'html-v1' and state['monthly']['status'] == 'pending'
            assert monthly.get_attribute('contenteditable') == 'false'
            assert not errors, errors
            browser.close()
        print(f'PASS: five real toolbar actions, inline marks, ordered 1/2/3, exit list, literal text, save/reload, safe paste, monthly latest edits on submit, mobile/read-only. Artifacts: {output}')
    finally:
        server.shutdown(); server.server_close()


if __name__ == '__main__': main()
