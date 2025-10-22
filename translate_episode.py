#!/usr/bin/env python3
import json
import re

# MDファイルからシーンコンテンツを抽出
def extract_scenes_from_md(md_file):
    """MDファイルからシーンコンテンツを抽出"""
    scenes = {}
    current_act = ""
    scene_count = 0

    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 各シーンを抽出
    lines = content.split('\n')
    current_scene = []
    in_scene = False

    for line in lines:
        if line.startswith('#### **') and '**' in line:
            # 新しい幕開始
            if '第一幕' in line or 'Act 1' in line:
                current_act = "Everyday-Life-and-Anomaly"
            elif '第二幕' in line or 'Act 2' in line:
                current_act = "Accepting-and-Analyzing-the-Request"
            elif '第三幕' in line or 'Act 3' in line:
                current_act = "Ghost-Hacking"
            elif '第四幕' in line or 'Act 4' in line:
                current_act = "Resolution-and-Epilogue"
            scene_count = 0
            continue

        if line.strip() and not line.startswith('#') and not line.startswith('####') and current_act:
            if not in_scene:
                in_scene = True
                current_scene = []
                scene_count += 1

            current_scene.append(line)

        elif line.strip() == '' and in_scene:
            # シーンの終わり
            if current_scene:
                scene_key = f"{current_act}-scene-{scene_count}"
                scenes[scene_key] = '\n'.join(current_scene).strip()
                current_scene = []
                in_scene = False

    # 最後のシーンを保存
    if current_scene:
        scene_key = f"{current_act}-scene-{scene_count}"
        scenes[scene_key] = '\n'.join(current_scene).strip()

    return scenes

def translate_jsonld(input_file, output_file, scenes_dict):
    """JSON-LDファイルを翻訳"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # シーンごとに英語版のコンテンツを適用
    for item in data['@graph']:
        if item.get('@type') == 'gh:Scene':
            scene_id = item.get('@id', '')
            if scene_id.startswith('gh:Scene:'):
                # シーンキーを抽出
                parts = scene_id.split('-scene-')
                if len(parts) == 2:
                    act_part = parts[0].replace('gh:Scene:', '')
                    scene_num = parts[1]
                    scene_key = f"{act_part}-scene-{scene_num}"

                    if scene_key in scenes_dict:
                        item['textContent'] = scenes_dict[scene_key]

        elif item.get('@type') in ['gh:Act', 'gh:Character', 'gh:Location', 'gh:Event', 'gh:Concept']:
            if 'name' in item:
                item['name'] = translate_text(item['name'])

    # IDも更新
    id_mappings = {
        "gh:Act:-----": "gh:Act:Everyday-Life-and-Anomaly",
        "gh:Act:--------": "gh:Act:Accepting-and-Analyzing-the-Request",
        "gh:Act:---------": "gh:Act:Ghost-Hacking",
        "gh:Act:--------": "gh:Act:Resolution-and-Epilogue"
    }

    for item in data['@graph']:
        if item.get('@id') in id_mappings:
            item['@id'] = id_mappings[item['@id']]

        # has_act, has_sceneのリファレンスも更新
        for key in ['has_act', 'has_scene']:
            if key in item and isinstance(item[key], list):
                for ref in item[key]:
                    if isinstance(ref, dict) and '@id' in ref:
                        if ref['@id'] in id_mappings:
                            ref['@id'] = id_mappings[ref['@id']]

        # シーンIDの更新
        if item.get('@type') == 'gh:Scene' and '@id' in item:
            # シーンIDのパターンを更新
            item['@id'] = re.sub(r'gh:Scene:------scene-', 'gh:Scene:Everyday-Life-and-Anomaly-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:---------scene-', 'gh:Scene:Accepting-and-Analyzing-the-Request-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:----------scene-', 'gh:Scene:Ghost-Hacking-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:---------scene-', 'gh:Scene:Resolution-and-Epilogue-scene-', item['@id'])

    # 出力
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def translate_text(text):
    """日本語のテキストを英語に翻訳する（簡易版）"""
    # 基本的な翻訳辞書
    translations = {
        # Act names
        "日常と異変": "Everyday Life and Anomaly",
        "依頼の受理と分析": "Accepting and Analyzing the Request",
        "ゴーストハッキング": "Ghost Hacking",
        "解決とエピローグ": "Resolution and Epilogue",

        # Character names (keep as is)
        "Kaede": "Kaede",
        "Tamaki": "Tamaki",
        "Hibiki": "Hibiki",
        "Nei-Chan": "Nei-Chan",
        "Logos": "Logos",
        "Elias": "Elias",
        "少年": "Boy",

        # Location names
        "渋谷の運河": "Shibuya Canal",
        "オフィス": "Office",
        "コンサルティングルーム": "Consulting Room",
        "アルカディア・モデル": "Arcadia Model",
        "研究室": "Laboratory",
        "ライブラリの入り口": "Library Entrance",
        "ライブラリの奥": "Library Core",

        # Concept names
        "ゴースト": "Ghost",
        "スピリット": "Spirit",
        "生命の樹": "Tree of Life",
        "非分離": "Unity",
        "アヤワスカ": "Ayahuasca",
        "精神ダイブ": "Mental Dive",
        "フォトン": "Photon",

        # Common phrases
        "ゴーストハッカー": "Ghost Hacker",
        "心の結び目": "heart knots",
        "精神汚染": "spiritual pollution",
        "悪性ゴースト": "malignant ghosts",
        "音の処方箋": "musical prescription",
        "精神ダイブ": "mental dive",
        "生命の樹": "Tree of Life",
        "非分離（אַחְדוּת）": "Unity (אַחְדוּת)",
        "アヤワスカ": "Ayahuasca",
        "魂の解放": "soul liberation"
    }

    result = text
    for jp, en in translations.items():
        result = result.replace(jp, en)

    # 引用符の変換
    result = re.sub(r'「([^」]+)」', r'"\1"', result)  # 「」を""に
    result = re.sub(r'『([^』]+)』', r'"\1"', result)  # 『』を""に
    result = re.sub(r'……', r'...', result)  # ……を...に

    return result

if __name__ == '__main__':
    # MDファイルからシーンを抽出
    scenes_dict = extract_scenes_from_md('/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/en_Episode_01_Masterpiece.md')

    # JSON-LDファイルを翻訳
    translate_jsonld(
        '/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/ja_Episode_01_Masterpiece.jsonld',
        '/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/en_Episode_01_Masterpiece.jsonld',
        scenes_dict
    )
            if 'name' in item:
                item['name'] = translate_text(item['name'])

    # IDも更新
    id_mappings = {
        "gh:Act:-----": "gh:Act:Everyday-Life-and-Anomaly",
        "gh:Act:--------": "gh:Act:Accepting-and-Analyzing-the-Request",
        "gh:Act:---------": "gh:Act:Ghost-Hacking",
        "gh:Act:--------": "gh:Act:Resolution-and-Epilogue"
    }

    for item in data['@graph']:
        if item.get('@id') in id_mappings:
            item['@id'] = id_mappings[item['@id']]

        # has_act, has_sceneのリファレンスも更新
        for key in ['has_act', 'has_scene']:
            if key in item and isinstance(item[key], list):
                for ref in item[key]:
                    if isinstance(ref, dict) and '@id' in ref:
                        if ref['@id'] in id_mappings:
                            ref['@id'] = id_mappings[ref['@id']]

        # シーンIDの更新
        if item.get('@type') == 'gh:Scene' and '@id' in item:
            # シーンIDのパターンを更新
            item['@id'] = re.sub(r'gh:Scene:------scene-', 'gh:Scene:Everyday-Life-and-Anomaly-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:---------scene-', 'gh:Scene:Accepting-and-Analyzing-the-Request-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:----------scene-', 'gh:Scene:Ghost-Hacking-scene-', item['@id'])
            item['@id'] = re.sub(r'gh:Scene:---------scene-', 'gh:Scene:Resolution-and-Epilogue-scene-', item['@id'])

    # 出力
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    translate_jsonld(
        '/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/ja_Episode_01_Masterpiece.jsonld',
        '/Users/junkawasaki/jun784/ghosthacker/250806/episodes/episode1/en_Episode_01_Masterpiece.jsonld'
    )
