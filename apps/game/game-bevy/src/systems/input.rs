/**
 * Input System
 * 入力処理システム
 * 
 * @context {
 *   "@id": "ex:InputSystem",
 *   "@type": "ex:System",
 *   "ex:handles": ["ex:DragDrop", "ex:Tap", "ex:Swipe", "ex:VoiceInput"]
 * }
 */

use bevy::prelude::*;
use bevy::input::mouse::MouseButtonInput;
use bevy::input::ButtonState;
use bevy::input::keyboard::KeyCode;

/// 入力システム: ドラッグ&ドロップ、タップ、スワイプ、音声入力を処理
pub fn input_system(
    mut mouse_button_input_events: EventReader<MouseButtonInput>,
    mut touch_input: EventReader<bevy::input::touch::TouchInput>,
    keyboard_input: Res<ButtonInput<KeyCode>>,
) {
    // マウス/タッチ入力処理
    for event in mouse_button_input_events.read() {
        match event.state {
            ButtonState::Pressed => {
                // TODO: ドラッグ開始、タップ処理
            }
            ButtonState::Released => {
                // TODO: ドロップ処理
            }
        }
    }

    // タッチ入力処理（スワイプ検出）
    for touch in touch_input.read() {
        // TODO: スワイプ検出とカードスクロール処理
    }

    // 音声入力（WASM: Web Speech API、iOS/Android: ネイティブAPI）
    // TODO: 音声入力処理を実装
}

