/**
 * Font Resource
 * フォントリソース
 */

use bevy::prelude::*;

/// 日本語フォントハンドル
#[derive(Resource)]
pub struct JapaneseFont(pub Handle<Font>);

