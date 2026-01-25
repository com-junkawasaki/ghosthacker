#!/usr/bin/env python3
"""
Generate a full Season 1 storyboard with:
- 12 episodes
- 16 pages per episode (Episode 1: 17 pages to match existing script)
- 1–6 panels per page
- ARIA-style atmosphere (clean luminous air, soft diffused light)
- Ocular detail on close-ups
- Max ~3 key entities mentioned per prompt (2 characters + 1 prop/ghost)

Inputs:
- apps/zen-editor/data/260125-jump/season1_bible.jsonld  (beats for episodes 1–12)
- 260125-jump/generation_prompts.jsonld                 (detailed Episode 1 panel prompts)

Output:
- 260125-jump/storyboard.jsonld
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SEASON1_BIBLE = os.path.join(ROOT, "apps", "zen-editor", "data", "260125-jump", "season1_bible.jsonld")
GEN_EP1 = os.path.join(ROOT, "260125-jump", "generation_prompts.jsonld")
OUT = os.path.join(ROOT, "260125-jump", "storyboard.jsonld")


ARIA_ATMOSPHERE = "ARIA-style: luminous atmosphere, soft diffused natural light, pristine clean air"


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def clean_prompt(text: str) -> str:
    # Remove common style tags from earlier iterations; keep the concrete scene description.
    t = text.strip()
    # Drop trailing comma-separated style tail.
    t = re.sub(r",\s*(cinematic|photorealistic|high contrast|uhd|8k|film grain|cyberpunk|best quality|masterpiece)\b.*$", "", t, flags=re.IGNORECASE)
    # Drop redundant style words anywhere.
    t = re.sub(r"\b(cinematic|photorealistic|high contrast|uhd|8k|film grain|masterpiece|best quality)\b", "", t, flags=re.IGNORECASE)
    # Normalize whitespace and trailing punctuation/commas
    t = re.sub(r"\s{2,}", " ", t).strip()
    t = t.strip(" ,")
    return t


def infer_shot(text: str) -> str:
    s = text.lower()
    if "evolution chart" in s or "historical montage" in s:
        return "Wide Angle"
    if "cityscape" in s or "skyline" in s:
        return "Bird's Eye View"
    if "extreme close-up" in s or "extreme closeup" in s:
        return "Extreme Close-up"
    if "close-up" in s or "closeup" in s:
        return "Close-up"
    if "full page" in s and "vertical" in s:
        return "Full Page Vertical"
    if "splash panel" in s or "splash" in s:
        return "Full Page Splash"
    if "bird's eye" in s or "birds eye" in s:
        return "Bird's Eye View"
    if "pov" in s:
        return "POV Shot"
    if "wide shot" in s:
        return "Wide Shot"
    if "hands" in s or "keyboard" in s or "screen" in s:
        return "Insert Shot"
    return "Medium Shot"


def default_properties(shot: str) -> Dict[str, Any]:
    # Stable camera schema to help generation consistency.
    base: Dict[str, Any] = {
        "gh:atmosphere": ARIA_ATMOSPHERE,
        "gh:composition": "clean composition, clear subject separation",
        "gh:lighting": "soft diffused daylight, gentle shadows",
    }
    if shot in ("Wide Shot", "Wide Angle", "Bird's Eye View"):
        base.update({
            "gh:distance": shot,
            "gh:lens": "35mm" if shot != "Wide Angle" else "24mm",
            "gh:aperture": "f/2.8",
            "gh:focus": "deep focus",
            "gh:angle": "eye level" if shot != "Bird's Eye View" else "top-down",
        })
    elif shot in ("Full Page Vertical",):
        base.update({
            "gh:distance": "Wide Shot",
            "gh:lens": "24mm",
            "gh:aperture": "f/4",
            "gh:focus": "deep focus",
            "gh:angle": "vertical framing",
            "gh:composition": "strong vertical composition, centered subject",
        })
    elif shot in ("Full Page Splash",):
        base.update({
            "gh:distance": "Wide Shot",
            "gh:lens": "28mm",
            "gh:aperture": "f/2.8",
            "gh:focus": "deep focus with emphasized subject",
            "gh:angle": "dynamic angle",
            "gh:composition": "impact composition, clear silhouette and motion lines",
        })
    elif shot in ("POV Shot",):
        base.update({
            "gh:distance": "POV",
            "gh:lens": "35mm",
            "gh:aperture": "f/2.8",
            "gh:focus": "subject focus",
            "gh:angle": "first-person POV",
        })
    elif shot in ("Action Shot",):
        base.update({
            "gh:distance": "Medium Shot",
            "gh:lens": "35mm",
            "gh:aperture": "f/2.0",
            "gh:focus": "subject tracking focus",
            "gh:angle": "dynamic tracking",
            "gh:movement": "handheld or tracking shot, subtle motion blur",
        })
    elif shot in ("Close-up",):
        base.update({
            "gh:distance": "Close-up",
            "gh:lens": "85mm prime",
            "gh:aperture": "f/1.2",
            "gh:focus": "shallow depth of field, creamy bokeh",
            "gh:angle": "frontal",
            "gh:eyeDetail": "highly detailed expressive eyes, intricate iris patterns, sharp sparkling catchlights, crystalline ocular texture",
        })
    elif shot in ("Extreme Close-up",):
        base.update({
            "gh:distance": "Extreme Close-up",
            "gh:lens": "100mm macro",
            "gh:aperture": "f/2.8",
            "gh:focus": "macro focus on iris texture",
            "gh:angle": "ocular focus",
            "gh:eyeDetail": "extreme iris detail, sharp sparkling catchlights, crystalline ocular texture, visible eyelashes",
        })
    elif shot in ("Insert Shot",):
        base.update({
            "gh:distance": "Insert",
            "gh:lens": "50mm",
            "gh:aperture": "f/2.0",
            "gh:focus": "sharp focus on object/screen",
            "gh:angle": "over-shoulder or top-down insert",
        })
    else:
        base.update({
            "gh:distance": "Medium Shot",
            "gh:lens": "50mm",
            "gh:aperture": "f/1.8",
            "gh:focus": "subject focus, soft background",
            "gh:angle": "eye level",
        })
    return base


def aria_prompt_prefix(shot: str, properties: Dict[str, Any]) -> str:
    parts = [shot]
    ang = properties.get("gh:angle")
    if isinstance(ang, str) and ang:
        parts.append(ang)
    parts.append(ARIA_ATMOSPHERE)
    return ", ".join(parts) + ". "


def build_panel(panel_index: int, shot: str, scene_desc: str, properties: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    props = properties or default_properties(shot)
    core = clean_prompt(scene_desc)
    if core.endswith((".", "!", "?", "。", "！", "？")):
        prompt = aria_prompt_prefix(shot, props) + core
    else:
        prompt = aria_prompt_prefix(shot, props) + core + "."
    # Add gentle technical tail (kept consistent, not “style transfer”)
    lens = props.get("gh:lens")
    ap = props.get("gh:aperture")
    tail = []
    if lens:
        tail.append(f"shot on {lens}")
    if ap:
        tail.append(f"{ap}")
    tail.append("cinematic live-action")
    if tail:
        prompt += " " + ", ".join(tail) + "."
    return {
        "panel": panel_index,
        "shot": shot,
        "gh:shotProperties": props,
        "gh:runwayPrompt": prompt,
    }


def parse_season1_episodes(season_bible: Dict[str, Any]) -> List[Dict[str, Any]]:
    eps = season_bible.get("gh:seasonStructure", {}).get("gh:episodes", [])
    # Sort by number
    eps_sorted = sorted(eps, key=lambda e: int(e.get("gh:number", 0)))
    return eps_sorted


def load_episode1_pages_from_generation_prompts() -> Dict[int, List[str]]:
    """
    Returns: pageNumber -> list of panel promptEn strings
    """
    data = load_json(GEN_EP1)
    pages: Dict[int, List[str]] = {}
    for pp in data.get("gh:pagePrompts", []):
        page_id = pp.get("gh:pageId") or pp.get("pageId")  # old keys
        if not page_id:
            continue
        m = re.match(r"page:(\d+)$", str(page_id))
        if not m:
            continue
        page_num = int(m.group(1))
        panel_prompts = []
        for p in pp.get("gh:panelPrompts", []) or pp.get("panelPrompts", []):
            pe = p.get("gh:promptEn") or p.get("promptEn")
            if isinstance(pe, str) and pe.strip():
                panel_prompts.append(pe.strip())
        if panel_prompts:
            pages[page_num] = panel_prompts
    return pages


def generate_episode1() -> Dict[str, Any]:
    ep1_pages_src = load_episode1_pages_from_generation_prompts()
    # Ensure pages 1..17 exist; fill missing with a reasonable bridge page.
    pages: List[Dict[str, Any]] = []
    for pn in range(1, 18):
        panel_texts = ep1_pages_src.get(pn)
        if not panel_texts:
            # Bridge page (e.g., page 3 missing)
            if pn == 3:
                panel_texts = [
                    "Wide shot of a quiet Tokyo residential street in early morning, soft light and long shadows, a calm prelude before the case begins",
                    "Medium shot of Ren's minimal apartment-office interior, clean concrete walls and warm wood floor, a serene stillness",
                    "Insert shot of a phone notification with a new client inquiry, subtle vibration on a desk",
                ]
            else:
                panel_texts = [
                    "Wide shot of Tokyo cityscape under soft daylight, calm atmosphere",
                    "Medium shot of Ren walking with a neutral expression, light wind in the air",
                    "Close-up of eyes catching soft reflections, quiet determination",
                ]
        panels: List[Dict[str, Any]] = []
        for idx, txt in enumerate(panel_texts, start=1):
            shot = infer_shot(txt)
            # Inject key prop consistency for Ren's office (page 4)
            if pn == 4 and idx == 1:
                txt = txt + " Ren is slouching in an Okamura Cruise & Atlas ergonomic workstation chair."
            if pn == 4 and idx == 3:
                txt = txt + " Background: USM Haller modular storage and clean tech shelves."
            panels.append(build_panel(idx, shot, txt))
        pages.append({"gh:pageNumber": pn, "gh:panels": panels})

    return {
        "gh:episode": 1,
        "dct:title": "Arc A-1: 牙を剥く内部の影",
        "gh:pages": pages,
    }


def episode_env_and_icons(ep_num: int) -> Tuple[str, List[str], str]:
    """
    Returns (environmentSeed, mainChars, coreIcon)
    mainChars are used for text composition but prompts keep <=2 characters.
    """
    if ep_num in (1, 2, 3):
        return (
            "outdated Japanese construction office, ringing phones, fluorescent lights, paper documents, server rack corner",
            ["Ren", "Nei"],
            "Okamura Cruise & Atlas workstation / USM Haller (Ren office cutaways)"
        )
    if ep_num in (4, 5, 6):
        return (
            "large logistics warehouse, trucks and conveyors, industrial control room monitors, dawn mist",
            ["Ren", "Nei", "Takeru"],
            "crowbar / stopwatch / DONE stamp"
        )
    if ep_num in (7, 8, 9):
        return (
            "luxury financial HQ, marble lobby, glass meeting rooms, sterile server room, bright daylight",
            ["Ren", "Nei", "Kaname"],
            "torque wrench / compliance papers / audit logs"
        )
    return (
        "Tokyo rooftops, operations center screens, police evidence room, overseas apartment base, neon rain",
        ["Ren", "Nei", "Takeru", "Kaname"],
        "SEIGI_HERO mask / market ticker / raid lights"
    )


def generate_episode_from_bible(ep_meta: Dict[str, Any]) -> Dict[str, Any]:
    num = int(ep_meta.get("gh:number"))
    title = ep_meta.get("dct:title") or ep_meta.get("dct:title".replace("dct:", "dct:")) or ep_meta.get("dct:title")
    # The season1_bible uses dct:title in nested objects; but here keys are "dct:title".
    title = ep_meta.get("dct:title") or f"Episode {num}"
    hook = (ep_meta.get("gh:openingHook") or "").strip()
    beats = ep_meta.get("gh:practiceBeats") or []
    conflict = (ep_meta.get("gh:conflict") or "").strip()
    cliff = (ep_meta.get("gh:cliffhanger") or "").strip()
    ghost_battle = ep_meta.get("gh:ghostBattle") or {}
    ghost_visual = (ghost_battle.get("gh:visual") or ghost_battle.get("schema:name") or "").strip()
    ghost_turn = (ghost_battle.get("gh:turn") or "").strip()

    env, main_chars, icon = episode_env_and_icons(num)

    # Episode 1 is handled separately using generation_prompts.jsonld
    page_count = 16
    pages: List[Dict[str, Any]] = []

    def two_char_prompt(a: str, b: Optional[str], action: str, extra: str = "") -> str:
        # Keep <=2 named characters; environment and one icon/prop allowed.
        if b:
            return f"({a}:1.2) and ({b}:1.2) {action} in {env}. {extra}".strip()
        return f"({a}:1.2) {action} in {env}. {extra}".strip()

    # Page plan (1..16)
    for pn in range(1, page_count + 1):
        panels: List[Dict[str, Any]] = []
        if pn == 1:
            panels.append(build_panel(1, "Wide Shot", f"{hook}. Establishing shot: {env}"))
            panels.append(build_panel(2, "Medium Shot", two_char_prompt(main_chars[0], None, "stands still, scanning the scene calmly", f"icon: {icon}")))
            panels.append(build_panel(3, "Close-up", f"Close-up of ({main_chars[0]}:1.2) eyes, calm but alert, catching soft window reflections"))
        elif pn == 2:
            panels.append(build_panel(1, "Insert Shot", f"Insert shot of a phone notification / incident alert dashboard, minimal UI, urgent timestamp"))
            panels.append(build_panel(2, "Medium Shot", two_char_prompt(main_chars[0], "Nei" if "Nei" in main_chars else None, "leaning toward a screen, analyzing fast", "soft blue screen glow")))
            panels.append(build_panel(3, "Close-up", f"Close-up of ({'Nei' if 'Nei' in main_chars else main_chars[0]}:1.2) eyes with intricate iris patterns and sharp catchlights"))
        elif pn in (3, 4):
            beat = beats[0] if len(beats) > 0 else "Initial containment and evidence preservation"
            panels.append(build_panel(1, "Wide Shot", f"Wide shot of teams pausing operations as containment begins. {beat}"))
            panels.append(build_panel(2, "Insert Shot", f"Insert shot of a checklist / runbook page titled 'CONTAINMENT' with timestamps and boxes checked"))
            panels.append(build_panel(3, "Medium Shot", two_char_prompt(main_chars[0], None, "raises a hand to stop a panicked restart", "gentle but firm gesture")))
        elif pn in (5, 6):
            beat = beats[1] if len(beats) > 1 else "Prioritize minimal recovery and safe manual operations"
            who = main_chars[2] if len(main_chars) > 2 else main_chars[0]
            panels.append(build_panel(1, "Medium Shot", two_char_prompt(who, None, "moves decisively, pointing at a manual process board", f"{beat}")))
            panels.append(build_panel(2, "Insert Shot", f"Insert shot of a stopwatch / DONE watch showing elapsed minutes, urgent but controlled"))
            panels.append(build_panel(3, "Close-up", f"Close-up of ({who}:1.2) eyes, intense focus, crisp catchlights"))
        elif pn in (7, 8):
            # conflict
            panels.append(build_panel(1, "Wide Shot", f"Wide shot of a tense meeting space in {env}. {conflict}"))
            panels.append(build_panel(2, "Medium Shot", two_char_prompt(main_chars[0], None, "sits calmly while others argue off-screen", "stillness against tension")))
            panels.append(build_panel(3, "Close-up", f"Close-up on ({main_chars[0]}:1.2) eyes, reflective, evaluating human motives"))
        elif pn in (9, 10):
            # ghost hint / manifestation build
            panels.append(build_panel(1, "POV Shot", f"POV shot with subtle AR overlay: faint shadow patterns clinging to a workstation, hinting at a Ghost. {ghost_visual}"))
            panels.append(build_panel(2, "Wide Shot", f"Wide shot as the environment subtly distorts—papers flutter, cables twitch, air shimmers"))
            panels.append(build_panel(3, "Insert Shot", f"Insert shot of a SIP device / analysis rig indicator switching from OFF to ON"))
        elif pn in (11, 12):
            # battle start
            panels.append(build_panel(1, "Wide Shot", f"Wide shot of the Ghost fully manifesting: {ghost_visual}"))
            panels.append(build_panel(2, "Medium Shot", two_char_prompt(main_chars[0], "Nei" if "Nei" in main_chars else None, "steps forward, coordinating silently", f"turning point: {ghost_turn}")))
            panels.append(build_panel(3, "Close-up", f"Close-up of ({main_chars[0]}:1.2) eyes reflecting moving light patterns from the Ghost"))
        elif pn in (13, 14):
            # climax
            panels.append(build_panel(1, "Action Shot", two_char_prompt(main_chars[0], None, "launches into action, cutting through swirling debris", "motion blur, controlled choreography")))
            panels.append(build_panel(2, "Full Page Splash", f"Full page splash: the Ghost core fractures into luminous particles, air clears, quiet returns"))
        elif pn == 15:
            panels.append(build_panel(1, "Wide Shot", f"Wide shot of the aftermath in {env}, debris settling, people breathing again"))
            panels.append(build_panel(2, "Insert Shot", f"Insert shot of evidence package: logs, timeline, and screenshots neatly organized for handoff"))
            panels.append(build_panel(3, "Close-up", f"Close-up of a relieved face with detailed eyes and soft catchlights, calm trust in the air"))
        else:  # pn == 16
            panels.append(build_panel(1, "Wide Shot", f"Wide shot, calm but unresolved. {cliff}"))
            panels.append(build_panel(2, "Medium Shot", two_char_prompt(main_chars[0], "Nei" if "Nei" in main_chars else None, "walks away into soft dusk light", "luminous air, gentle wind")))
            panels.append(build_panel(3, "Close-up", f"Close-up of ({main_chars[0]}:1.2) eyes, a small reflective glint hinting at the next case"))

        pages.append({"gh:pageNumber": pn, "gh:panels": panels})

    return {"gh:episode": num, "dct:title": title, "gh:pages": pages}


def main() -> None:
    season = load_json(SEASON1_BIBLE)
    episode_metas = parse_season1_episodes(season)

    episodes: List[Dict[str, Any]] = []
    episodes.append(generate_episode1())

    # Generate Episodes 2..12 from the bible beats
    for em in episode_metas:
        n = int(em.get("gh:number", 0))
        if n <= 1 or n > 12:
            continue
        episodes.append(generate_episode_from_bible(em))

    storyboard: Dict[str, Any] = {
        "@context": {
            "gh": "https://ghosthacker.gftd.ai/ns/",
            "schema": "http://schema.org/",
            "dct": "http://purl.org/dc/terms/",
            "prov": "http://www.w3.org/ns/prov#",
            "character": "gh:character/",
            "arc": "gh:arc/",
            "panel": "gh:panelIndex",
            "purpose": "gh:narrativePurpose",
            "shot": "gh:shotType",
            "prompt": "gh:runwayPrompt",
            "properties": "gh:shotProperties",
        },
        "@id": "gh:storyboard/master-season1",
        "@type": ["gh:MasterStoryboard", "prov:Entity"],
        "dct:title": "Ghost Hacker Season 1: Master Storyboard (ARIA Cinematic Base - FULL)",
        "dct:description": "Full Season 1 storyboard: 12 episodes, all pages and panels. Realistic live-action Runway base prompts with ARIA aesthetic (clean luminous air, soft light) and structured shot properties.",
        "gh:globalStyle": "ARIA-style: luminous atmosphere, soft diffused natural light, pristine clean air. Emphasize detailed expressive eyes with intricate iris patterns and sharp catchlights.",
        "gh:runwayConstraints": "Max 3 key entities per prompt (2 characters + 1 prop/ghost), no dialogue text, stable shot schema via gh:shotProperties.",
        "gh:episodes": episodes,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(storyboard, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()

