/**
 * UI System
 * UIシステム実装
 * 
 * @context {
 *   "@id": "ex:UISystem",
 *   "@type": "ex:System",
 *   "ex:handles": ["ex:GhostGenerationUI", "ex:ProblemPresentationUI", "ex:PuzzleUI", "ex:ReconstructionUI"]
 * }
 */

use bevy::prelude::*;
use crate::components::{ButtonType, CurrentPuzzleMode};
use crate::resources::{GameState, JapaneseFont};
use crate::ui::{load_jsonld_ui, build_screen_from_jsonld};
use game_core::session::SessionState;

/// UIルートマーカー
#[derive(Component)]
pub(crate) struct UiRootMarker;

/// UIシステム: 各フェーズに応じたUIを表示
pub fn ui_system(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    game_state: Res<GameState>,
    ui_query: Query<Entity, With<UiRootMarker>>,
    japanese_font: Res<JapaneseFont>,
) {
    // 既存のUIが存在する場合は何もしない（状態変更時は別のシステムで削除）
    if !ui_query.is_empty() {
        return;
    }

    if let Some(session) = &game_state.current_session {
        match session.state {
            SessionState::GeneratingGhost => {
                // ゴースト生成フェーズUI
                spawn_ghost_generation_ui(&mut commands, &asset_server, &japanese_font);
            }
            SessionState::PresentingProblem => {
                // 問題提示フェーズUI
                spawn_problem_presentation_ui(&mut commands, &asset_server, session, &japanese_font);
            }
            SessionState::SolvingPuzzle => {
                // 因果パズルフェーズUI
                spawn_puzzle_ui(&mut commands, &asset_server, session, &japanese_font);
            }
            SessionState::Reconstructing => {
                // 再構成フェーズUI
                spawn_reconstruction_ui(&mut commands, &asset_server, session, &japanese_font);
            }
            SessionState::Reflecting => {
                // リフレクションフェーズUI
                spawn_reflection_ui(&mut commands, &asset_server, session, &japanese_font);
            }
            _ => {}
        }
    } else {
        // 初期画面（JSON-LDから生成）
        info!("Attempting to load JSON-LD UI...");
        match spawn_intro_ui_from_jsonld(&mut commands, &japanese_font) {
            Ok(_) => {
                info!("JSON-LD UI loaded successfully");
            }
            Err(e) => {
                warn!("Failed to load JSON-LD UI, falling back to default: {}", e);
                spawn_intro_ui(&mut commands, &asset_server, &japanese_font);
            }
        }
    }
}

/// イントロ画面UI（JSON-LDから生成）
fn spawn_intro_ui_from_jsonld(commands: &mut Commands, font: &Res<JapaneseFont>) -> Result<(), String> {
    // プロジェクトルートからの相対パス
    let json_ld_paths = [
        "game/game-bevy/ui/intro-screen.jsonld.mdc",
        "game-bevy/ui/intro-screen.jsonld.mdc",
        "../game-bevy/ui/intro-screen.jsonld.mdc",
    ];
    
    let mut json_ld = None;
    for path in &json_ld_paths {
        if let Ok(ld) = load_jsonld_ui(path) {
            json_ld = Some(ld);
            break;
        }
    }
    
    let json_ld = json_ld.ok_or_else(|| "JSON-LD file not found in any expected location".to_string())?;
    
    build_screen_from_jsonld(commands, &json_ld, "ghui:IntroScreen", font)?;
    
    Ok(())
}

/// イントロ画面UI（フォールバック用）
fn spawn_intro_ui(commands: &mut Commands, _asset_server: &Res<AssetServer>, font: &Res<JapaneseFont>) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // タイトル
            parent.spawn(TextBundle::from_section(
                "Ghost Hacker",
                TextStyle {
                    font: font.0.clone(),
                    font_size: 48.0,
                    color: Color::WHITE,
                },
            ));

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(40.0),
                    ..default()
                },
                ..default()
            });

            // 説明文
            parent.spawn(TextBundle::from_section(
                "これは、あなたの影から生まれるゴーストです。",
                TextStyle {
                    font: font.0.clone(),
                    font_size: 20.0,
                    color: Color::rgb(0.8, 0.8, 0.8),
                },
            ));

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(60.0),
                    ..default()
                },
                ..default()
            });

            // はじめるボタン
            parent
                .spawn((
                    ButtonBundle {
                        style: Style {
                            padding: UiRect::all(Val::Px(20.0)),
                            ..default()
                        },
                        background_color: Color::rgb(0.2, 0.5, 0.8).into(),
                        ..default()
                    },
                    ButtonType::StartGame,
                ))
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "はじめる",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 24.0,
                            color: Color::WHITE,
                        },
                    ));
                });
        });
}

/// ゴースト生成フェーズUI
fn spawn_ghost_generation_ui(commands: &mut Commands, _asset_server: &Res<AssetServer>, font: &Res<JapaneseFont>) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // タイトル
            parent.spawn(TextBundle::from_section(
                "ゴーストを生成",
                TextStyle {
                    font: font.0.clone(),
                    font_size: 32.0,
                    color: Color::WHITE,
                },
            ));

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(40.0),
                    ..default()
                },
                ..default()
            });

            // カード選択エリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(90.0),
                        flex_direction: FlexDirection::Row,
                        ..default()
                    },
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: カード選択UIを実装
                    parent.spawn(TextBundle::from_section(
                        "カード選択エリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(20.0),
                    ..default()
                },
                ..default()
            });

            // タグ選択エリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(90.0),
                        flex_direction: FlexDirection::Row,
                        flex_wrap: FlexWrap::Wrap,
                        ..default()
                    },
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: タグ選択UIを実装
                    parent.spawn(TextBundle::from_section(
                        "タグ選択エリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(20.0),
                    ..default()
                },
                ..default()
            });

            // スライダーエリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(90.0),
                        flex_direction: FlexDirection::Column,
                        ..default()
                    },
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: スライダーUIを実装
                    parent.spawn(TextBundle::from_section(
                        "スライダーエリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });
        });
}

/// 問題提示フェーズUI
fn spawn_problem_presentation_ui(
    commands: &mut Commands,
    _asset_server: &Res<AssetServer>,
    _session: &game_core::session::Session,
    font: &Res<JapaneseFont>,
) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // ゴースト発話表示
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(100.0),
                        padding: UiRect::all(Val::Px(20.0)),
                        margin: UiRect::bottom(Val::Px(20.0)),
                        ..default()
                    },
                    background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                    ..default()
                })
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "ゴーストのモノローグ...",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 18.0,
                            color: Color::WHITE,
                        },
                    ));
                });

            // 断片カード横スクロールUI
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(100.0),
                        height: Val::Percent(60.0),
                        flex_direction: FlexDirection::Row,
                        ..default()
                    },
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: 横スクロール可能なカードUIを実装
                    parent.spawn(TextBundle::from_section(
                        "断片カードエリア（横スクロール）",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });
        });
}

/// 因果パズルフェーズUI
fn spawn_puzzle_ui(
    commands: &mut Commands,
    _asset_server: &Res<AssetServer>,
    _session: &game_core::session::Session,
    font: &Res<JapaneseFont>,
) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // モード切り替えボタン
            parent
                .spawn(NodeBundle {
                    style: Style {
                        flex_direction: FlexDirection::Row,
                        margin: UiRect::bottom(Val::Px(20.0)),
                        ..default()
                    },
                    ..default()
                })
                .with_children(|parent| {
                    // 時系列モード
                    parent.spawn((
                        ButtonBundle {
                            style: Style {
                                padding: UiRect::all(Val::Px(15.0)),
                                ..default()
                            },
                            background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                            ..default()
                        },
                        ButtonType::PuzzleModeTimeline,
                    ))
                    .with_children(|parent| {
                        parent.spawn(TextBundle::from_section(
                            "時系列",
                            TextStyle {
                                font: font.0.clone(),
                                font_size: 16.0,
                                color: Color::WHITE,
                            },
                        ));
                    });

                    // 因果モード
                    parent.spawn((
                        ButtonBundle {
                            style: Style {
                                padding: UiRect::all(Val::Px(15.0)),
                                ..default()
                            },
                            background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                            ..default()
                        },
                        ButtonType::PuzzleModeCausality,
                    ))
                    .with_children(|parent| {
                        parent.spawn(TextBundle::from_section(
                            "因果",
                            TextStyle {
                                font: font.0.clone(),
                                font_size: 16.0,
                                color: Color::WHITE,
                            },
                        ));
                    });

                    // 感情モード
                    parent.spawn((
                        ButtonBundle {
                            style: Style {
                                padding: UiRect::all(Val::Px(15.0)),
                                ..default()
                            },
                            background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                            ..default()
                        },
                        ButtonType::PuzzleModeEmotion,
                    ))
                    .with_children(|parent| {
                        parent.spawn(TextBundle::from_section(
                            "感情",
                            TextStyle {
                                font: font.0.clone(),
                                font_size: 16.0,
                                color: Color::WHITE,
                            },
                        ));
                    });
                });

            // パズル操作エリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(100.0),
                        height: Val::Percent(70.0),
                        ..default()
                    },
                    background_color: Color::rgb(0.15, 0.15, 0.2).into(),
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: パズル操作UIを実装
                    parent.spawn(TextBundle::from_section(
                        "パズル操作エリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });
        });
}

/// 再構成フェーズUI
fn spawn_reconstruction_ui(
    commands: &mut Commands,
    _asset_server: &Res<AssetServer>,
    _session: &game_core::session::Session,
    font: &Res<JapaneseFont>,
) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // 気づきモノローグ表示
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(100.0),
                        padding: UiRect::all(Val::Px(20.0)),
                        margin: UiRect::bottom(Val::Px(20.0)),
                        ..default()
                    },
                    background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                    ..default()
                })
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "気づきモノローグ...",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 18.0,
                            color: Color::WHITE,
                        },
                    ));
                });

            // 3Dグラフアニメーション表示エリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(100.0),
                        height: Val::Percent(60.0),
                        ..default()
                    },
                    background_color: Color::rgb(0.05, 0.05, 0.1).into(),
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: 3Dグラフアニメーション表示
                    parent.spawn(TextBundle::from_section(
                        "3Dグラフアニメーションエリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });
        });
}

/// リフレクションフェーズUI
fn spawn_reflection_ui(
    commands: &mut Commands,
    _asset_server: &Res<AssetServer>,
    _session: &game_core::session::Session,
    font: &Res<JapaneseFont>,
) {
    commands
        .spawn((
            NodeBundle {
                style: Style {
                    width: Val::Percent(100.0),
                    height: Val::Percent(100.0),
                    flex_direction: FlexDirection::Column,
                    align_items: AlignItems::Center,
                    justify_content: JustifyContent::Center,
                    padding: UiRect::all(Val::Px(20.0)),
                    ..default()
                },
                background_color: Color::rgb(0.1, 0.1, 0.15).into(),
                ..default()
            },
            UiRootMarker,
        ))
        .with_children(|parent| {
            // 質問表示
            parent.spawn(TextBundle::from_section(
                "質問: このセッションで何を学びましたか？",
                TextStyle {
                    font: font.0.clone(),
                    font_size: 20.0,
                    color: Color::WHITE,
                },
            ));

            parent.spawn(NodeBundle {
                style: Style {
                    height: Val::Px(40.0),
                    ..default()
                },
                ..default()
            });

            // 回答入力エリア
            parent
                .spawn(NodeBundle {
                    style: Style {
                        width: Val::Percent(80.0),
                        height: Val::Px(200.0),
                        padding: UiRect::all(Val::Px(15.0)),
                        margin: UiRect::bottom(Val::Px(20.0)),
                        ..default()
                    },
                    background_color: Color::rgb(0.2, 0.2, 0.3).into(),
                    ..default()
                })
                .with_children(|parent| {
                    // TODO: テキスト入力フィールドを実装
                    parent.spawn(TextBundle::from_section(
                        "回答入力エリア",
                        TextStyle {
                            font: font.0.clone(),
                            font_size: 16.0,
                            color: Color::rgb(0.7, 0.7, 0.7),
                        },
                    ));
                });

            // 送信ボタン
            parent
                .spawn((
                    ButtonBundle {
                        style: Style {
                            padding: UiRect::all(Val::Px(20.0)),
                            ..default()
                        },
                        background_color: Color::rgb(0.2, 0.5, 0.8).into(),
                        ..default()
                    },
                    ButtonType::SubmitReflection,
                ))
                .with_children(|parent| {
                    parent.spawn(TextBundle::from_section(
                        "送信",
                        TextStyle {
                            font_size: 20.0,
                            color: Color::WHITE,
                            ..default()
                        },
                    ));
                });
        });
}
