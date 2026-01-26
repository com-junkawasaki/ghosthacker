#!/usr/bin/env python3
"""
Markdown連結スクリプト
Wattpadエピソードのpart*.mdファイルを連結してcombined.mdとcombined.en.mdを生成
"""
import os
import re
from pathlib import Path

def find_part_files(episode_dir: Path, language: str = "ja") -> list[Path]:
    """エピソードディレクトリからpartファイルを順番に取得"""
    suffix = ".md" if language == "ja" else ".en.md"
    parts = []
    
    # part1, part2, part3, ... の順で検索
    part_num = 1
    while True:
        part_file = episode_dir / f"part{part_num}{suffix}"
        if part_file.exists():
            parts.append(part_file)
            part_num += 1
        else:
            break
    
    return parts

def concatenate_parts(part_files: list[Path]) -> str:
    """複数のpartファイルを連結"""
    contents = []
    for part_file in part_files:
        with open(part_file, 'r', encoding='utf-8') as f:
            content = f.read().rstrip()
            contents.append(content)
    
    # 各partの間に空行2つを挿入
    return "\n\n\n".join(contents)

def process_episode(episode_dir: Path):
    """1つのエピソードディレクトリを処理"""
    print(f"Processing: {episode_dir.name}")
    
    # 日本語版
    ja_parts = find_part_files(episode_dir, "ja")
    if ja_parts:
        combined_ja = concatenate_parts(ja_parts)
        output_ja = episode_dir / "combined.md"
        with open(output_ja, 'w', encoding='utf-8') as f:
            f.write(combined_ja)
        print(f"  ✓ Created: {output_ja.name} ({len(ja_parts)} parts)")
    else:
        print(f"  ⚠ No Japanese parts found")
    
    # 英語版
    en_parts = find_part_files(episode_dir, "en")
    if en_parts:
        combined_en = concatenate_parts(en_parts)
        output_en = episode_dir / "combined.en.md"
        with open(output_en, 'w', encoding='utf-8') as f:
            f.write(combined_en)
        print(f"  ✓ Created: {output_en.name} ({len(en_parts)} parts)")
    else:
        print(f"  ⚠ No English parts found")

def create_all_episodes_combined(episodes_dir: Path, episode_dirs: list[Path], language: str = "ja"):
    """全エピソードを結合したファイルを作成"""
    suffix = ".md" if language == "ja" else ".en.md"
    combined_files = []
    
    for episode_dir in sorted(episode_dirs):
        combined_file = episode_dir / f"combined{suffix}"
        if combined_file.exists():
            combined_files.append(combined_file)
    
    if not combined_files:
        print(f"  ⚠ No combined files found for {language}")
        return
    
    # 全エピソードの内容を連結
    contents = []
    for combined_file in combined_files:
        with open(combined_file, 'r', encoding='utf-8') as f:
            content = f.read().rstrip()
            # エピソード番号を抽出して見出しを追加
            episode_match = re.search(r'ep(\d+)', combined_file.parent.name)
            if episode_match:
                episode_num = episode_match.group(1)
                contents.append(f"# Episode {episode_num}\n\n{content}")
            else:
                contents.append(content)
    
    # 各エピソードの間に空行3つを挿入
    all_content = "\n\n\n\n".join(contents)
    
    # 出力ファイル名
    output_suffix = ".md" if language == "ja" else ".en.md"
    output_file = episodes_dir / f"all_episodes{output_suffix}"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(all_content)
    
    print(f"  ✓ Created: {output_file.name} ({len(combined_files)} episodes)")

def main():
    """メイン処理"""
    # エピソードディレクトリのパス
    root = Path(__file__).parent.parent
    episodes_dir = root / "251022" / "wattpad" / "episodes"
    
    if not episodes_dir.exists():
        print(f"Error: Episodes directory not found: {episodes_dir}")
        return
    
    # ep01からep12まで処理
    episode_dirs = []
    for i in range(1, 13):
        episode_name = f"ep{i:02d}"
        episode_dir = episodes_dir / episode_name
        if episode_dir.exists() and episode_dir.is_dir():
            episode_dirs.append(episode_dir)
    
    if not episode_dirs:
        print(f"No episode directories found in {episodes_dir}")
        return
    
    print(f"Found {len(episode_dirs)} episode directories")
    print("=" * 60)
    
    # 各エピソードのcombinedファイルを作成
    for episode_dir in sorted(episode_dirs):
        process_episode(episode_dir)
    
    print("=" * 60)
    print("Creating all-episodes combined files...")
    
    # 全エピソードを結合したファイルを作成
    create_all_episodes_combined(episodes_dir, episode_dirs, "ja")
    create_all_episodes_combined(episodes_dir, episode_dirs, "en")
    
    print("=" * 60)
    print("Done!")

if __name__ == "__main__":
    main()

