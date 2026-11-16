"""Attach existing typed questions to framework reviews without creating tasks."""
def build_guides(approved, legacy, explicit):
    guides = dict(explicit)
    types = {'名词解释', '简答题', '论述题', '填空与识记', '分析题', '作品阅读', '章节检测'}
    actions = {'名词解释': '背诵', '简答题': '背诵', '论述题': '背诵', '填空与识记': '识记', '分析题': '应用检测', '作品阅读': '框架理解', '章节检测': '应用检测'}
    outlines = [t for t in approved['tasks'] if t['type'] == '课本梳理'] + [t for t in legacy if t.get('phase') == 'first' and t['type'] == '课本梳理']
    for t in outlines:
        source, unit = t['sourceId'], t.get('unit')
        if source in guides:
            continue
        if t['course'] == '现代汉语' and source.startswith('framework-121-part'):
            guides[source] = {'title': t['title'] + '｜规则识记与教材例词检测', 'type': '课本梳理', 'chapterChecklist': True,
                              'basis': '原分项任务范围内的检测方式，不是新增真题或答案。',
                              'targets': [{'type': '填空与识记', 'title': t['title'] + '的规则', 'action': '识记', 'requirement': '按原分项笔记合书说出规则，只检查本标题，不扩大到其他音变。'},
                                          {'type': '分析题', 'title': t['title'] + '的教材例词判断', 'action': '应用检测', 'requirement': '用已学教材例词判断并说明依据，再核对订正；不新增未提供的例题或答案。'}]}
            continue
        units = set(t.get('sourceUnits') or [unit])
        if source == 'framework-26':
            units = {'B018'}
            t = {**t, 'title': '第三编魏晋南北朝文学 第2章 两晋诗坛'}
        candidates = [q for q in approved['tasks'] if q.get('unit') in units and q['type'] in types]
        if not candidates:
            candidates = [q for q in approved['questionIndex'] if q.get('newUnit') in units and q['type'] in types]
        if not candidates:
            candidates = [q for q in legacy if q.get('phase') == 'first' and q.get('unit') in units and q['type'] in types]
        targets, seen = [], set()
        for q in candidates:
            key = (q['type'], q['title'])
            if key in seen:
                continue
            seen.add(key)
            action = actions[q['type']]
            if '提纲掌握' in (q.get('scope', '') + q.get('role', '')) and action == '背诵':
                action = '背答题提纲'
            requirement = '使用原来这道题的教材与笔记答案，合书作答后核对；未学内容仍按原安排待补，不因整章勾选而算作已学。'
            if action == '应用检测':
                requirement = '用本题原定的教材例词、例句或作品材料独立分析，再核对订正；未学内容仍按原安排待补。'
            elif action == '框架理解':
                requirement = '回忆原清单指定的作品材料及其与本章知识的联系，不另加完整背诵答案。'
            targets.append({'type': q['type'], 'title': q['title'], 'action': action, 'requirement': requirement, 'sourceTaskId': q['id']})
        guide = {'title': t['title'] + '｜框架检测与本章题单', 'type': '课本梳理', 'chapterChecklist': True,
                 'basis': '仅引用原确认任务、按章真题索引或旧版同章独立题目；不新增题干、答案或学习记录。',
                 'targets': [{'type': '课本梳理', 'title': t['title'] + '的教材主线、概念及例证定位', 'action': '框架检测，不背整章',
                              'requirement': '合书列出本标题范围的教材骨架，再核对已有梳理。具体背诵题见下面逐题清单，不能用整章复述替代独立题目。'}] + targets}
        guides[source] = guide
    return guides
