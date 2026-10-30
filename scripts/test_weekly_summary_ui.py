"""Browser QA against mocked APIs. No real account or database is used.

Requires playwright and a local Chrome installation, plus a frontend build:
  cd frontend
  node node_modules/vite/bin/vite.js build . --configLoader runner --outDir dist-weekly-summary-qa
  cd ..
  python scripts/test_weekly_summary_ui.py
"""
import copy
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'frontend' / os.environ.get('FRONTEND_QA_DIST', 'dist-weekly-summary-qa')
OUTPUT = Path(os.environ.get('WEEKLY_QA_DIR', os.environ.get('TEMP', '.'))) / 'weekly-ui-test'
OUTPUT.mkdir(exist_ok=True)
USER = {'_id': 'a' * 24, 'username': 'qa-admin', 'fullName': 'Quản trị kiểm thử', 'role': 'admin', 'department': 'Phòng', 'mustChangePassword': False}
PERIOD = {'_id': 'b' * 24, 'type': 'weekly', 'title': 'Tuần 04 tháng 10 năm 2026', 'startDate': '2026-10-19T00:00:00Z', 'dueDate': '2026-10-22T16:59:59Z', 'status': 'open'}
GROUPS = [dict(id=key, title=title) for key, title in [
    ('personnel', 'Lĩnh vực Nội vụ và công tác cán bộ'), ('education', 'Giáo dục và đào tạo'),
    ('social', 'Bảo trợ xã hội và bảo hiểm y tế'), ('health', 'Y tế'),
    ('veterans', 'Người có công'), ('administration', 'Tổ chức bộ máy, công tác cán bộ và cải cách hành chính'),
    ('digital', 'Khoa học, công nghệ và chuyển đổi số'), ('culture', 'Văn hóa và các lĩnh vực liên quan'),
]]
FIXTURE = {'summary': {'periodId': PERIOD['_id'], 'periodTitle': 'Tuần 43 năm 2026', 'content': 'Nội dung cũ', 'nextTasks': 'Nhiệm vụ cũ', 'difficulties': 'Khó khăn nguyên văn', 'proposals': 'Kiến nghị nguyên văn', 'entries': [{'id': 'entry', 'groupId': None, 'section': 'results', 'text': 'Nội dung 168 lượt\nĐoạn lĩnh vực khác'}]}, 'period': {**PERIOD, 'title': 'Tuần 43 năm 2026'}, 'nextPeriodTitle': 'Tuần 44 năm 2026', 'groups': GROUPS, 'employeeReports': [], 'missingEmployees': [{'_id': 'c' * 24, 'fullName': 'Chuyên viên chưa nộp', 'department': 'Phòng'}], 'submissionStats': {'expected': 3, 'submitted': 2, 'missing': 1, 'late': 0, 'duplicateReports': 0}}


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path == '/weekly-summary':
            self.path = '/index.html'
        return super().do_GET()

    def log_message(self, *_args):
        pass


def main():
    assert (DIST / 'index.html').exists(), 'Build frontend first'
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(DIST)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    state = copy.deepcopy(FIXTURE)
    state['autoFilled'] = True
    state['summary']['entries'] = [
        {'id': 'one', 'groupId': 'health', 'section': 'results', 'text': 'Nguồn 1'},
        {'id': 'two', 'groupId': 'health', 'section': 'results', 'text': 'Nguồn 2'},
    ]
    errors = []
    saved = []
    availability = {'ready': False}

    def api(route):
        path = urlparse(route.request.url).path
        if path == '/api/ready':
            route.fulfill(status=200 if availability['ready'] else 503, json={'ready': availability['ready'], 'phase': 'ready' if availability['ready'] else 'initializing', 'mongodb': 'connected'})
            return
        elif path == '/api/auth/me':
            result = USER
        elif path == '/api/periods':
            result = [PERIOD]
        elif path == '/api/periods/current':
            result = PERIOD
        elif path == '/api/notifications':
            result = {'notifications': [], 'unreadCount': 0}
        elif path.endswith('/export-pdf') or path.endswith('/export-docx'):
            ext = 'pdf' if path.endswith('/export-pdf') else 'docx'
            # UI download wiring only; real bytes tested separately by route/document tests.
            route.fulfill(status=200, body=b'%PDF-UI-MOCK' if ext == 'pdf' else b'PK-UI-MOCK', headers={'Content-Type': 'application/octet-stream'})
            return
        elif path.startswith('/api/weekly-summaries/'):
            if route.request.method == 'PATCH':
                patch = route.request.post_data_json
                saved.append(copy.deepcopy(patch))
                state['summary'].update(patch)
                state['autoFilled'] = False
            result = state
        else:
            route.fulfill(status=404, json={'error': path})
            return
        route.fulfill(status=200, json=result)

    try:
        with sync_playwright() as p:
            chrome = os.environ.get('CHROME_BIN', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
            browser = p.chromium.launch(executable_path=chrome, headless=True)
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, accept_downloads=True)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/api/**', api)
            page.add_init_script(f"localStorage.setItem('token','fixture-only'); localStorage.setItem('user', {json.dumps(json.dumps(USER))});")
            url = f'http://127.0.0.1:{server.server_port}/weekly-summary?periodId={PERIOD["_id"]}'
            page.goto(url)
            page.get_by_text('Hệ thống chưa sẵn sàng', exact=True).wait_for()
            assert page.get_by_role('button', name='Lưu bản tổng hợp', exact=True).count() == 0
            page.screenshot(path=str(OUTPUT / 'startup-wait.png'))
            availability['ready'] = True
            page.get_by_role('heading', name='I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ TUẦN 43', exact=True).wait_for()
            assert page.get_by_role('combobox', name='Chọn kỳ báo cáo tuần').inner_text().startswith('Tuần 43 năm 2026')
            assert page.locator('form textarea').count() == 16
            assert page.locator('form select').count() == 0
            assert page.get_by_role('button', name='Thêm nội dung', exact=True).count() == 0
            assert page.get_by_role('button', name='Tách tại vị trí con trỏ', exact=True).count() == 0
            result = page.get_by_role('textbox', name='Kết quả - Y tế', exact=True)
            assert result.input_value() == 'Nguồn 1\n\nNguồn 2'
            state['summary']['entries'][0]['text'] = 'Nguồn vừa cập nhật'
            page.wait_for_function("document.querySelector('#summary-results-health').value.includes('Nguồn vừa cập nhật')")
            result.fill('Nội dung đã sửa: 168 lượt')
            state['summary']['entries'][0]['text'] = 'Nguồn mới không được ghi đè admin'
            page.wait_for_timeout(5500)
            assert result.input_value() == 'Nội dung đã sửa: 168 lượt'
            page.get_by_role('textbox', name='Nhiệm vụ - Giáo dục và đào tạo', exact=True).fill('Nhiệm vụ giáo dục tuần tới')
            availability['ready'] = False
            page.get_by_text('Hệ thống chưa sẵn sàng', exact=True).wait_for()
            assert page.locator('form textarea').count() == 16
            assert page.locator('[inert]').count() == 1
            availability['ready'] = True
            page.get_by_text('Hệ thống chưa sẵn sàng', exact=True).wait_for(state='hidden')
            page.get_by_role('button', name='Lưu bản tổng hợp', exact=True).click()
            page.wait_for_function("document.body.innerText.includes('Đã lưu bản tổng hợp')")
            assert len(saved[-1]['entries']) == 2
            assert saved[-1]['entries'][0]['text'] == 'Nội dung đã sửa: 168 lượt'
            assert saved[-1]['entries'][1]['text'] == 'Nhiệm vụ giáo dục tuần tới'
            page.reload()
            page.get_by_role('textbox', name='Kết quả - Y tế', exact=True).wait_for()
            assert page.locator('form textarea').count() == 16
            assert page.get_by_role('textbox', name='Kết quả - Y tế', exact=True).input_value() == 'Nội dung đã sửa: 168 lượt'
            assert page.get_by_role('textbox', name='Nhiệm vụ - Giáo dục và đào tạo', exact=True).input_value() == 'Nhiệm vụ giáo dục tuần tới'
            with page.expect_download() as download:
                page.get_by_role('button', name='Lưu & Xuất PDF', exact=True).click()
            assert download.value.suggested_filename.endswith('.pdf')
            with page.expect_download() as download:
                page.get_by_role('button', name='Lưu & Xuất DOCX', exact=True).click()
            assert download.value.suggested_filename.endswith('.docx')
            page.screenshot(path=str(OUTPUT / 'desktop-grouped.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
            page.screenshot(path=str(OUTPUT / 'mobile-grouped.png'), full_page=True)
            state['period']['status'] = 'archived'
            page.reload()
            page.get_by_role('button', name='Xuất PDF', exact=True).wait_for()
            assert page.get_by_role('button', name='Lưu bản tổng hợp', exact=True).is_disabled()
            assert page.locator('form textarea').first.is_disabled()
            with page.expect_download() as download:
                page.get_by_role('button', name='Xuất PDF', exact=True).click()
            state['period']['status'] = 'open'
            state['summary'].pop('entries')
            page.reload()
            page.get_by_role('heading', name='I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ TUẦN 43', exact=True).wait_for()
            assert page.locator('form h4').count() == 16
            assert page.locator('form textarea').count() == 16
            assert all(value == '' for value in page.locator('form textarea').evaluate_all('(els) => els.map(el => el.value)'))
            assert page.get_by_role('button', name='Chuyển nội dung hiện tại sang 8 nhóm').count() == 0
            assert 'Khó khăn, vướng mắc' not in page.inner_text('body')
            assert 'Kiến nghị, đề xuất' not in page.inner_text('body')
            assert 'Bản tổng hợp cũ' not in page.inner_text('body')
            page.screenshot(path=str(OUTPUT / 'admin-empty-new-template.png'), full_page=True)
            assert not errors, errors
            browser.close()
        print(f'PASS: 16 fixed textareas, no group/section dropdowns or add/split controls, save/reload by field, desktop/mobile, readiness and archived. Screenshots: {OUTPUT}')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
