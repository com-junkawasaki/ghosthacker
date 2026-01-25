/**
 * JSON-LD UI Builder
 * JSON-LD定義からBevy UIコンポーネントを生成
 * 
 * @context {
 *   "@id": "ex:JsonLdUIBuilder",
 *   "@type": "ex:UIBuilder",
 *   "ex:builds": ["ex:BevyNodeBundle", "ex:BevyTextBundle", "ex:BevyButtonBundle"]
 * }
 */

use bevy::prelude::*;
use serde_json::Value;
use crate::components::ButtonType;
use crate::resources::JapaneseFont;
use crate::systems::ui::UiRootMarker;

/// カラー文字列をBevy Colorに変換
fn parse_color(color_str: &str) -> Color {
    if color_str.starts_with('#') {
        let hex = &color_str[1..];
        if hex.len() == 6 {
            let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(0);
            let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(0);
            let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(0);
            Color::rgb_u8(r, g, b)
        } else {
            Color::WHITE
        }
    } else {
        Color::WHITE
    }
}

/// サイズ文字列をValに変換
fn parse_size(size_str: &str) -> Val {
    if size_str.ends_with("%") {
        let percent = size_str[..size_str.len() - 1]
            .parse::<f32>()
            .unwrap_or(100.0);
        Val::Percent(percent)
    } else if size_str.ends_with("px") {
        let px = size_str[..size_str.len() - 2]
            .parse::<f32>()
            .unwrap_or(0.0);
        Val::Px(px)
    } else {
        Val::Auto
    }
}

/// JSON-LD PanelからNodeBundleを生成
pub fn build_panel(element: &Value, _font: &Res<JapaneseFont>) -> NodeBundle {
    let mut style = Style::default();
    
    if let Some(width) = element.get("width").and_then(|w| w.as_str()) {
        style.width = parse_size(width);
    }
    if let Some(height) = element.get("height").and_then(|h| h.as_str()) {
        style.height = parse_size(height);
    }
    if let Some(padding) = element.get("padding").and_then(|p| p.as_str()) {
        let px = padding.replace("px", "").parse::<f32>().unwrap_or(0.0);
        style.padding = UiRect::all(Val::Px(px));
    }
    if let Some(flex_dir) = element.get("flexDirection").and_then(|d| d.as_str()) {
        style.flex_direction = match flex_dir {
            "column" => FlexDirection::Column,
            "row" => FlexDirection::Row,
            _ => FlexDirection::Column,
        };
    }
    if let Some(align) = element.get("align").and_then(|a| a.as_str()) {
        style.align_items = match align {
            "center" => AlignItems::Center,
            "flex-start" => AlignItems::FlexStart,
            "flex-end" => AlignItems::FlexEnd,
            _ => AlignItems::Center,
        };
    }
    if let Some(justify) = element.get("justify").and_then(|j| j.as_str()) {
        style.justify_content = match justify {
            "center" => JustifyContent::Center,
            "flex-start" => JustifyContent::FlexStart,
            "flex-end" => JustifyContent::FlexEnd,
            _ => JustifyContent::Center,
        };
    }

    let bg_color = element
        .get("backgroundColor")
        .and_then(|c| c.as_str())
        .map(|c| parse_color(c))
        .unwrap_or(Color::NONE);

    NodeBundle {
        style,
        background_color: bg_color.into(),
        ..default()
    }
}

/// JSON-LD TextBlockからTextBundleを生成
pub fn build_text(element: &Value, font: &Res<JapaneseFont>) -> TextBundle {
    let text = element
        .get("text")
        .and_then(|t| t.as_str())
        .unwrap_or("")
        .to_string();

    let font_size = element
        .get("fontSize")
        .and_then(|s| s.as_str())
        .and_then(|s| s.replace("px", "").parse::<f32>().ok())
        .unwrap_or(16.0);

    let text_color = element
        .get("textColor")
        .and_then(|c| c.as_str())
        .map(|c| parse_color(c))
        .unwrap_or(Color::WHITE);

    TextBundle::from_section(
        text,
        TextStyle {
            font: font.0.clone(),
            font_size,
            color: text_color,
        },
    )
}

/// JSON-LD ButtonからButtonBundleを生成
pub fn build_button(element: &Value, font: &Res<JapaneseFont>) -> (ButtonBundle, ButtonType) {
    let mut button_style = Style::default();
    
    if let Some(width) = element.get("width").and_then(|w| w.as_str()) {
        button_style.width = parse_size(width);
    }
    if let Some(height) = element.get("height").and_then(|h| h.as_str()) {
        button_style.height = parse_size(height);
    }
    if let Some(padding) = element.get("padding").and_then(|p| p.as_str()) {
        let px = padding.replace("px", "").parse::<f32>().unwrap_or(0.0);
        button_style.padding = UiRect::all(Val::Px(px));
    }

    let bg_color = element
        .get("backgroundColor")
        .and_then(|c| c.as_str())
        .map(|c| parse_color(c))
        .unwrap_or(Color::rgb(0.2, 0.5, 0.8));

    // ボタンタイプを決定（IDから推測）
    let button_type = if element.get("id")
        .and_then(|id| id.as_str())
        .map(|id| id.contains("PrimaryButton") || id.contains("Start"))
        .unwrap_or(false)
    {
        ButtonType::StartGame
    } else {
        ButtonType::StartGame // デフォルト
    };

    (
        ButtonBundle {
            style: button_style,
            background_color: bg_color.into(),
            ..default()
        },
        button_type,
    )
}

/// JSON-LD ScreenからBevy UIを構築
pub fn build_screen_from_jsonld(
    commands: &mut Commands,
    json_ld: &Value,
    screen_id: &str,
    font: &Res<JapaneseFont>,
) -> Result<Entity, String> {
    let screen = crate::ui::jsonld_loader::find_element_by_id(json_ld, screen_id)
        .ok_or_else(|| format!("Screen not found: {}", screen_id))?;

    // 背景レイヤーを作成
    let theme = screen
        .get("theme")
        .and_then(|t| t.as_str())
        .and_then(|t| crate::ui::jsonld_loader::find_element_by_id(json_ld, t));

    let bg_color = theme
        .and_then(|t| t.get("backgroundColor").and_then(|c| c.as_str()))
        .map(|c| parse_color(c))
        .unwrap_or(Color::rgb(0.1, 0.1, 0.15));

    eprintln!("Building screen from JSON-LD, background color: {:?}", bg_color);
    
    let root_entity = commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    ..default()
                },
                background_color: bg_color.into(),
                ..default()
            },
            UiRootMarker,
        ))
        .id();
    
    eprintln!("Root entity created: {:?}", root_entity);

    // レイヤーを処理
    if let Some(layers) = screen.get("layers").and_then(|l| l.as_array()) {
        for layer_id in layers {
            if let Some(layer_id_str) = layer_id.as_str() {
                if let Some(layer) = crate::ui::jsonld_loader::find_element_by_id(json_ld, layer_id_str) {
                    build_layer(commands, json_ld, layer, font, root_entity);
                }
            }
        }
    }

    Ok(root_entity)
}

/// レイヤーを構築
fn build_layer(
    commands: &mut Commands,
    json_ld: &Value,
    layer: &Value,
    font: &Res<JapaneseFont>,
    parent: Entity,
) {
    if let Some(children) = layer.get("children").and_then(|c| c.as_array()) {
        eprintln!("Layer has {} children", children.len());
        commands.entity(parent).with_children(|parent| {
            for child_id in children {
                if let Some(child_id_str) = child_id.as_str() {
                    eprintln!("Processing child: {}", child_id_str);
                    if let Some(child) = crate::ui::jsonld_loader::find_element_by_id(json_ld, child_id_str) {
                        build_element(json_ld, child, font, parent);
                        eprintln!("Child {} processed", child_id_str);
                    } else {
                        eprintln!("Child {} not found in JSON-LD", child_id_str);
                    }
                }
            }
        });
    } else {
        eprintln!("Layer has no children");
    }
}

/// UI要素を構築
fn build_element(
    json_ld: &Value,
    element: &Value,
    font: &Res<JapaneseFont>,
    parent: &mut ChildBuilder,
) {
    let element_type = element
        .get("type")
        .and_then(|t| t.as_str())
        .unwrap_or("");

    match element_type {
        t if t.contains("Panel") => {
            let panel = build_panel(element, font);
            // Panelに子要素がある場合は再帰的に処理
            if let Some(children) = element.get("children").and_then(|c| c.as_array()) {
                parent.spawn(panel).with_children(|parent| {
                    for child_id in children {
                        if let Some(child_id_str) = child_id.as_str() {
                            if let Some(child) = crate::ui::jsonld_loader::find_element_by_id(json_ld, child_id_str) {
                                build_element(json_ld, child, font, parent);
                            }
                        }
                    }
                });
            } else {
                parent.spawn(panel);
            }
        }
        t if t.contains("TextBlock") => {
            let text = build_text(element, font);
            parent.spawn(text);
        }
        t if t.contains("Button") => {
            let (button_bundle, button_type) = build_button(element, font);
            parent
                .spawn((button_bundle, button_type))
                .with_children(|parent| {
                    let text_bundle = build_text(element, font);
                    parent.spawn(text_bundle);
                });
        }
        t if t.contains("Layer") => {
            // レイヤーは再帰的に処理
            if let Some(children) = element.get("children").and_then(|c| c.as_array()) {
                for child_id in children {
                    if let Some(child_id_str) = child_id.as_str() {
                        if let Some(child) = crate::ui::jsonld_loader::find_element_by_id(json_ld, child_id_str) {
                            build_element(json_ld, child, font, parent);
                        }
                    }
                }
            }
        }
        _ => {}
    }
}

