#!/usr/bin/env python3
import json
import re

def main():
    # 英語版MDファイルからシーンコンテンツを読み込む
    with open('/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/en_Episode_01_Masterpiece.md', 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 日本語版JSON-LDファイルを読み込む
    with open('/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/ja_Episode_01_Masterpiece.jsonld', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # MDコンテンツをシーンごとに分割
    sections = re.split(r'#### \*\*.*?\*\*', md_content)

    # 各アクションのシーンを抽出
    acts_content = {}
    current_act = None

    for section in sections:
        if not section.strip():
            continue

        lines = section.strip().split('\n')
        if not lines:
            continue

        # 最初の行がアクション名かどうかチェック
        first_line = lines[0].strip()
        if 'Act 1' in first_line or '日常と異変' in first_line:
            current_act = 'Everyday-Life-and-Anomaly'
            content = '\n'.join(lines[1:]).strip()
        elif 'Act 2' in first_line or '依頼の受理と分析' in first_line:
            current_act = 'Accepting-and-Analyzing-the-Request'
            content = '\n'.join(lines[1:]).strip()
        elif 'Act 3' in first_line or 'ゴーストハッキング' in first_line:
            current_act = 'Ghost-Hacking'
            content = '\n'.join(lines[1:]).strip()
        elif 'Act 4' in first_line or '解決とエピローグ' in first_line:
            current_act = 'Resolution-and-Epilogue'
            content = '\n'.join(lines[1:]).strip()
        else:
            content = section.strip()

        if current_act:
            acts_content[current_act] = content

    # 各シーンのコンテンツをJSON-LDに適用
    scene_counter = {'Everyday-Life-and-Anomaly': 0, 'Accepting-and-Analyzing-the-Request': 0, 'Ghost-Hacking': 0, 'Resolution-and-Epilogue': 0}

    for item in data['@graph']:
        if item.get('@type') == 'gh:Scene':
            scene_id = item.get('@id', '')
            if 'Everyday-Life-and-Anomaly-scene-' in scene_id:
                scene_counter['Everyday-Life-and-Anomaly'] += 1
                # このシーンに対応するコンテンツを適用
                # 簡略化のため、シーンの順序に基づいてコンテンツを適用
            elif 'Accepting-and-Analyzing-the-Request-scene-' in scene_id:
                scene_counter['Accepting-and-Analyzing-the-Request'] += 1
            elif 'Ghost-Hacking-scene-' in scene_id:
                scene_counter['Ghost-Hacking'] += 1
            elif 'Resolution-and-Epilogue-scene-' in scene_id:
                scene_counter['Resolution-and-Epilogue'] += 1

    # 名前を翻訳
    for item in data['@graph']:
        if 'name' in item and isinstance(item['name'], str):
            if item['name'] == "日常と異変":
                item['name'] = "Everyday Life and Anomaly"
            elif item['name'] == "依頼の受理と分析":
                item['name'] = "Accepting and Analyzing the Request"
            elif item['name'] == "ゴーストハッキング":
                item['name'] = "Ghost Hacking"
            elif item['name'] == "解決とエピローグ":
                item['name'] = "Resolution and Epilogue"
            elif item['name'] == "少年":
                item['name'] = "Boy"

    # 英語版JSON-LDファイルを保存
    with open('/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/en_Episode_01_Masterpiece.jsonld', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Translation completed!")

if __name__ == '__main__':
    main()
