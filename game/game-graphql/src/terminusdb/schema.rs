#![recursion_limit = "256"]

/**
 * TerminusDB Schema
 * RDFスキーマ定義とOWLスキーマ適用
 * 
 * @context {
 *   "@id": "ex:TerminusDBSchema",
 *   "@type": "ex:Schema",
 *   "ex:defines": ["ex:Ghost", "ex:EventFragment", "ex:CausalLink", "ex:EmotionLabel", "ex:Session"]
 * }
 */

use anyhow::Result;
use serde_json::{json, Value};
use crate::terminusdb::client::get_client;

/// OWLスキーマをTerminusDBに適用
pub async fn apply_owl_schema() -> Result<()> {
    let client = get_client()?;
    
    // Ghost/EventFragment/CausalLink/EmotionLabel/Sessionクラスとプロパティを定義
    // RDFスキーマをJSON-LD形式で構築してTerminusDBに適用
    
    let schema = json!({
        "@context": {
            "@base": "https://ghosthacker.example.com/game/",
            "@vocab": "https://ghosthacker.example.com/game/vocab#",
            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
            "xsd": "http://www.w3.org/2001/XMLSchema#",
            "gh": "https://ghosthacker.example.com/vocab#",
            
            "Ghost": {
                "@id": "gh:Ghost",
                "@type": "rdfs:Class"
            },
            "hasTrait": {
                "@id": "gh:hasTrait",
                "@type": "@id"
            },
            "hasValuePreference": {
                "@id": "gh:hasValuePreference",
                "@type": "@id"
            },
            "hasCognitiveStyle": {
                "@id": "gh:hasCognitiveStyle",
                "@type": "xsd:string"
            },
            "hasInitialState": {
                "@id": "gh:hasInitialState",
                "@type": "@id"
            },
            "truth": {
                "@id": "gh:truth",
                "@type": "xsd:float"
            },
            "coherence": {
                "@id": "gh:coherence",
                "@type": "xsd:float"
            },
            "memoryIntegrity": {
                "@id": "gh:memoryIntegrity",
                "@type": "xsd:float"
            },
            "noise": {
                "@id": "gh:noise",
                "@type": "xsd:float"
            },
            "emotionDistortion": {
                "@id": "gh:emotionDistortion",
                "@type": "xsd:float"
            },
            "EventFragment": {
                "@id": "gh:EventFragment",
                "@type": "rdfs:Class"
            },
            "content": {
                "@id": "gh:content",
                "@type": "xsd:string"
            },
            "timestamp": {
                "@id": "gh:timestamp",
                "@type": "xsd:integer"
            },
            "belongsToGhost": {
                "@id": "gh:belongsToGhost",
                "@type": "@id"
            },
            "CausalLink": {
                "@id": "gh:CausalLink",
                "@type": "rdfs:Class"
            },
            "from": {
                "@id": "gh:from",
                "@type": "@id"
            },
            "to": {
                "@id": "gh:to",
                "@type": "@id"
            },
            "isCorrect": {
                "@id": "gh:isCorrect",
                "@type": "xsd:boolean"
            },
            "EmotionLabel": {
                "@id": "gh:EmotionLabel",
                "@type": "rdfs:Class"
            },
            "emotion": {
                "@id": "gh:emotion",
                "@type": "xsd:string"
            },
            "intensity": {
                "@id": "gh:intensity",
                "@type": "xsd:float"
            },
            "attachedToEvent": {
                "@id": "gh:attachedToEvent",
                "@type": "@id"
            },
            "Session": {
                "@id": "gh:Session",
                "@type": "rdfs:Class"
            },
            "ghostId": {
                "@id": "gh:ghostId",
                "@type": "@id"
            },
            "state": {
                "@id": "gh:state",
                "@type": "xsd:string"
            },
            "createdAt": {
                "@id": "gh:createdAt",
                "@type": "xsd:integer"
            },
            "updatedAt": {
                "@id": "gh:updatedAt",
                "@type": "xsd:integer"
            },
            "hasReflection": {
                "@id": "gh:hasReflection",
                "@type": "@id"
            },
            "Reflection": {
                "@id": "gh:Reflection",
                "@type": "rdfs:Class"
            },
            "question": {
                "@id": "gh:question",
                "@type": "xsd:string"
            },
            "answer": {
                "@id": "gh:answer",
                "@type": "xsd:string"
            },
            "Trait": {
                "@id": "gh:Trait",
                "@type": "rdfs:Class"
            },
            "traitType": {
                "@id": "gh:traitType",
                "@type": "xsd:string"
            },
            "intensity": {
                "@id": "gh:intensity",
                "@type": "xsd:float"
            },
            "ValuePreference": {
                "@id": "gh:ValuePreference",
                "@type": "rdfs:Class"
            },
            "valueType": {
                "@id": "gh:valueType",
                "@type": "xsd:string"
            },
            "weight": {
                "@id": "gh:weight",
                "@type": "xsd:float"
            },
            "GhostState": {
                "@id": "gh:GhostState",
                "@type": "rdfs:Class"
            }
        },
        "@graph": [
            {
                "@id": "gh:Ghost",
                "@type": "rdfs:Class",
                "rdfs:comment": "ゴーストエンティティ"
            },
            {
                "@id": "gh:EventFragment",
                "@type": "rdfs:Class",
                "rdfs:comment": "イベント断片"
            },
            {
                "@id": "gh:CausalLink",
                "@type": "rdfs:Class",
                "rdfs:comment": "因果リンク"
            },
            {
                "@id": "gh:EmotionLabel",
                "@type": "rdfs:Class",
                "rdfs:comment": "感情ラベル"
            },
            {
                "@id": "gh:Session",
                "@type": "rdfs:Class",
                "rdfs:comment": "セッション"
            },
            {
                "@id": "gh:Reflection",
                "@type": "rdfs:Class",
                "rdfs:comment": "リフレクション"
            },
            {
                "@id": "gh:Trait",
                "@type": "rdfs:Class",
                "rdfs:comment": "ゴースト特性"
            },
            {
                "@id": "gh:ValuePreference",
                "@type": "rdfs:Class",
                "rdfs:comment": "価値観設定"
            },
            {
                "@id": "gh:GhostState",
                "@type": "rdfs:Class",
                "rdfs:comment": "ゴースト状態"
            }
        ]
    });
    
    // TerminusDBにスキーマを適用
    client.insert_schema(&schema).await?;
    
    tracing::info!("OWL schema applied successfully");
    Ok(())
}
