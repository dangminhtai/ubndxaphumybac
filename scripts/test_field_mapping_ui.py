"""Mocked browser QA for field assignments and a specialist's multi-field report."""
import copy
import functools
import json
import os
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from test_weekly_summary_ui import Handler, DIST, GROUPS, PERIOD

OUTPUT = Path(os.environ.get('WEEKLY_QA_DIR', os.environ.get('TEMP', '.'))) / 'field-mapping-ui'
OUTPUT.mkdir(exist_ok=True)


class Pages(Handler):
    def do_GET(self):
        if urlparse(self.path).path in ('/employee-report', '/admin/users'):
            self.path = '/index.html'
        return super().do_GET()


def main():
    assert (DIST / 'index.html').exists()
    users = [
        {'_id': 'a' * 24, 'id': 'a' * 24, 'username': 'linh', 'fullName': 'Chuyên viên hai lĩnh vực', 'role': 'staff', 'fieldCodes': ['LV1', 'LV6'], 'department': 'Phòng', 'isActive': True},
        {'_id': 'b' * 24, 'id': 'b' * 24, 'username': 'hanh', 'fullName': 'Chuyên viên giáo dục', 'role': 'staff', 'fieldCodes': ['LV2'], 'department': 'Phòng', 'isActive': True},
        {'_id': 'c' * 24, 'id': 'c' * 24, 'username': 'admin', 'fullName': 'Admin kiểm thử', 'role': 'admin', 'fieldCodes': [], 'department': 'Phòng', 'position': 'Phó phòng', 'isActive': True},
    ]
    state = {'report': None, 'saved': None, 'batch': None, 'review': True, 'mapping': None}
    errors = []
    def directory():
        return [{'code': f'LV{index}', 'title': group['title'], 'groupId': group['id'], 'owners': [{'id': user['id'], 'username': user['username'], 'fullName': user['fullName']} for user in users if f'LV{index}' in user['fieldCodes']]} for index, group in enumerate(GROUPS, 1)]

    def api(who):
        def handle(route):
            path = urlparse(route.request.url).path
            method = route.request.method
            data = route.request.post_data_json if method in ('POST', 'PATCH') else None
            if path == '/api/ready': result = {'ready': True, 'phase': 'ready', 'mongodb': 'connected'}
            elif path == '/api/auth/me': result = who
            elif path == '/api/notifications': result = {'notifications': [], 'unreadCount': 0}
            elif path == '/api/fields': result = directory()
            elif path == '/api/reports/weekly/current': result = {'period': PERIOD, 'report': state['report'] if who['id'] == users[0]['id'] else None, 'fields': directory(), 'assignedFieldCodes': who['fieldCodes']}
            elif path == '/api/reports/weekly':
                state['saved'] = copy.deepcopy(data)
                state['report'] = {'_id': 'd' * 24, 'reportType': 'weekly', 'status': data['status'], 'fieldReports': [{**row, 'fieldName': next(field['title'] for field in directory() if field['code'] == row['fieldCode'])} for row in data['fieldReports']]}
                result = state['report']
            elif path == '/api/fields/mine':
                route.fulfill(status=409, json={'error': 'Lĩnh vực này đã có người khác đảm nhận. Vui lòng liên hệ admin để xử lý.', 'code': 'FIELD_ALREADY_ASSIGNED'}); return
            elif path == '/api/admin/users': result = users
            elif path == '/api/fields/assignments':
                state['batch'] = copy.deepcopy(data)
                for row in data['assignments']:
                    next(user for user in users if user['id'] == row['userId'])['fieldCodes'] = row['fieldCodes']
                result = {'updated': len(data['assignments'])}
            elif path == '/api/fields/review': result = {'items': [{'_id': 'e' * 24, 'sender': 'Nguồn kiểm thử', 'title': 'Báo cáo chưa rõ mã', 'field': 'ABC', 'status': 'draft'}] if state['review'] else [], 'total': 1 if state['review'] else 0}
            elif path == f'/api/reports/{"e" * 24}/field-mapping' and method == 'GET':
                result = {'blocks': [{'fieldCode': None, 'fieldName': 'ABC', 'content': 'Nguyên văn 168 lượt', 'difficulties': 'Khó khăn gốc', 'proposals': 'Đề xuất gốc', 'nextTasks': 'Nhiệm vụ gốc'}], 'fields': directory(), 'revision': 'fixture-revision'}
            elif path == f'/api/reports/{"e" * 24}/field-mapping' and method == 'PATCH':
                state['mapping'] = data; state['review'] = False; result = {'mapped': True}
            else:
                route.fulfill(status=404, json={'error': path}); return
            route.fulfill(status=200, json=result)
        return handle

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Pages, directory=str(DIST)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=os.environ.get('CHROME_BIN', 'C:/Program Files/Google/Chrome/Application/chrome.exe'), headless=True)
            def new_page(user):
                page = browser.new_page(viewport={'width': 1440, 'height': 1000})
                page.add_init_script(f"localStorage.setItem('token','fixture'); localStorage.setItem('user',{json.dumps(json.dumps(user))});")
                page.route('**/api/**', api(user)); page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('dialog', lambda dialog: dialog.accept())
                return page
            staff = new_page(users[0])
            staff.goto(f'http://127.0.0.1:{server.server_port}/employee-report')
            staff.get_by_role('textbox', name='LV1 - 1. Kết quả thực hiện', exact=True).wait_for()
            assert staff.locator('textarea').count() == 4
            assert staff.get_by_text('2. Khó khăn, vướng mắc', exact=True).count() == 0
            assert staff.get_by_text('3. Kiến nghị, đề xuất', exact=True).count() == 0
            assert staff.get_by_placeholder('Nhập lĩnh vực phụ trách', exact=False).count() == 0
            staff.get_by_role('textbox', name='LV1 - 1. Kết quả thực hiện', exact=True).fill('Nội vụ nguyên văn 692')
            staff.get_by_role('textbox', name='LV6 - 1. Kết quả thực hiện', exact=True).fill('CCHC nguyên văn 168')
            staff.get_by_role('textbox', name='LV6 - 2. Phương hướng, nhiệm vụ tuần tới', exact=True).fill('Nhiệm vụ giữ riêng LV6')
            staff.get_by_role('button', name='Lưu nháp', exact=True).click()
            staff.get_by_text('Đã lưu nháp', exact=True).wait_for()
            assert state['saved']['fieldReports'][0]['content'] == 'Nội vụ nguyên văn 692'
            assert state['saved']['fieldReports'][1]['content'] == 'CCHC nguyên văn 168'
            assert state['saved']['fieldReports'][1]['nextTasks'] == 'Nhiệm vụ giữ riêng LV6'
            staff.reload()
            staff.get_by_role('textbox', name='LV6 - 1. Kết quả thực hiện', exact=True).wait_for()
            assert staff.get_by_role('textbox', name='LV6 - 2. Phương hướng, nhiệm vụ tuần tới', exact=True).input_value() == 'Nhiệm vụ giữ riêng LV6'
            staff.screenshot(path=str(OUTPUT / 'staff-two-fields.png'), full_page=True)
            staff.get_by_role('button', name='Thay đổi lĩnh vực', exact=True).click()
            staff.get_by_role('checkbox', name='LV2 — Giáo dục và đào tạo', exact=False).check()
            staff.get_by_role('button', name='Lưu phân công', exact=True).click()
            staff.get_by_role('alert').filter(has_text='Lĩnh vực này đã có người khác đảm nhận.').wait_for()
            assert staff.get_by_role('textbox', name='LV1 - 1. Kết quả thực hiện', exact=True).input_value() == 'Nội vụ nguyên văn 692'
            staff.screenshot(path=str(OUTPUT / 'staff-conflict.png'), full_page=True)
            staff.set_viewport_size({'width': 390, 'height': 844})
            assert staff.evaluate('document.documentElement.scrollWidth <= innerWidth')
            staff.screenshot(path=str(OUTPUT / 'staff-mobile.png'), full_page=True)
            single = new_page(users[1]); single.goto(f'http://127.0.0.1:{server.server_port}/employee-report')
            single.get_by_role('textbox', name='LV2 - 1. Kết quả thực hiện', exact=True).wait_for()
            assert single.locator('textarea').count() == 2
            single.close()
            admin = new_page(users[2]); admin.goto(f'http://127.0.0.1:{server.server_port}/admin/users')
            admin.get_by_role('combobox', name='Phụ trách LV1', exact=True).wait_for()
            admin.get_by_role('combobox', name='Phụ trách LV1', exact=True).select_option(users[1]['id'])
            admin.get_by_role('combobox', name='Phụ trách LV2', exact=True).select_option(users[0]['id'])
            admin.get_by_role('button', name='Lưu toàn bộ phân công', exact=True).click()
            admin.get_by_text('Đã lưu phân công cho tất cả chuyên viên.', exact=True).wait_for()
            assert next(row for row in state['batch']['assignments'] if row['userId'] == users[0]['id'])['fieldCodes'] == ['LV2', 'LV6']
            admin.locator('summary').filter(has_text='Báo cáo chưa xác định mã lĩnh vực').click()
            admin.get_by_role('button', name='Đối soát mã lĩnh vực nguồn').click()
            admin.get_by_text('Nguyên văn 168 lượt', exact=False).wait_for()
            admin.get_by_role('combobox', name='Mã lĩnh vực nguồn 1', exact=True).select_option('LV4')
            admin.get_by_role('button', name='Xác nhận mã nguồn', exact=True).click()
            admin.get_by_text('Báo cáo chưa xác định mã lĩnh vực (0)', exact=True).wait_for()
            assert state['mapping'] == {'fieldCodes': ['LV4'], 'revision': 'fixture-revision'}
            admin.screenshot(path=str(OUTPUT / 'admin-assignments.png'), full_page=True)
            admin.set_viewport_size({'width': 390, 'height': 844})
            assert admin.evaluate('document.documentElement.scrollWidth <= innerWidth')
            admin.screenshot(path=str(OUTPUT / 'admin-mobile.png'), full_page=True)
            assert not errors, errors
            browser.close()
        print(f'PASS: browser 2-field/4-textarea specialist form, save/reload, exact conflict message, atomic admin assignment request, source review, desktop/mobile. Screenshots: {OUTPUT}')
    finally:
        server.shutdown(); server.server_close()


if __name__ == '__main__':
    main()
