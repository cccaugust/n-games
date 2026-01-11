/**
 * N-Games Animation System
 * プロシージャルアニメーション管理
 */

export class AnimationSystem {
  constructor(THREE) {
    this.THREE = THREE;

    // アニメーション定義レジストリ
    this.animations = {
      // ========== キャラクター共通 ==========
      idle: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          // 呼吸のような上下動
          const breathe = Math.sin(t * 2) * 0.05;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + breathe;
          }
          // 体全体の微細な揺れ
          if (model.mesh) {
            model.mesh.rotation.y = model.mesh.userData.baseRotY + Math.sin(t * 1.5) * 0.02;
          }
        }
      },

      walk: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 脚の動き
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.5;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = -Math.sin(cycle) * 0.5;
          }

          // 腕の振り
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.sin(cycle) * 0.4;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = Math.sin(cycle) * 0.4;
          }

          // 体の上下動
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle)) * 0.1;
          }
        }
      },

      run: {
        duration: 0.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.5;

          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.8;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = -Math.sin(cycle) * 0.8;
          }
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.sin(cycle) * 0.6;
            model.parts.leftArm.rotation.z = 0.2;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = Math.sin(cycle) * 0.6;
            model.parts.rightArm.rotation.z = -0.2;
          }
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 2)) * 0.15;
            model.parts.body.rotation.x = Math.sin(cycle) * 0.05;
          }
        }
      },

      attack: {
        duration: 0.6,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.6, 1);

          // 右腕の攻撃モーション
          if (model.parts.rightArm) {
            if (progress < 0.3) {
              // 振りかぶり
              model.parts.rightArm.rotation.x = -progress / 0.3 * 1.5;
              model.parts.rightArm.rotation.z = -progress / 0.3 * 0.5;
            } else if (progress < 0.5) {
              // 振り下ろし
              const swingProgress = (progress - 0.3) / 0.2;
              model.parts.rightArm.rotation.x = -1.5 + swingProgress * 2.5;
              model.parts.rightArm.rotation.z = -0.5 + swingProgress * 0.5;
            } else {
              // 戻り
              const returnProgress = (progress - 0.5) / 0.5;
              model.parts.rightArm.rotation.x = 1.0 * (1 - returnProgress);
              model.parts.rightArm.rotation.z = 0;
            }
          }

          // 体の回転
          if (model.parts.body) {
            if (progress < 0.5) {
              model.parts.body.rotation.y = -progress * 0.3;
            } else {
              model.parts.body.rotation.y = -0.15 * (1 - (progress - 0.5) * 2);
            }
          }
        }
      },

      damage: {
        duration: 0.4,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.4, 1);

          // 後ろにのけぞる
          if (model.mesh) {
            model.mesh.position.z = Math.sin(progress * Math.PI) * -0.3;
            model.mesh.rotation.x = Math.sin(progress * Math.PI) * -0.2;
          }

          // 点滅効果
          const blink = Math.sin(t * 30) > 0;
          model.mesh.traverse(child => {
            if (child.material) {
              child.material.opacity = blink ? 0.5 : 1.0;
              child.material.transparent = true;
            }
          });
        }
      },

      victory: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2;

          // 両腕を上げて振る
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -2.5 + Math.sin(cycle * 2) * 0.3;
            model.parts.leftArm.rotation.z = 0.5;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -2.5 + Math.sin(cycle * 2 + 0.5) * 0.3;
            model.parts.rightArm.rotation.z = -0.5;
          }

          // ジャンプ
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle)) * 0.3;
          }
        }
      },

      // ========== スライム専用 ==========
      slimeIdle: {
        duration: 1.5,
        loop: true,
        update: (model, t, dt) => {
          const pulse = Math.sin(t * 3) * 0.1 + 1;
          if (model.mesh) {
            model.mesh.scale.set(pulse, 1 / pulse, pulse);
          }
        }
      },

      slimeHop: {
        duration: 0.6,
        loop: true,
        update: (model, t, dt) => {
          const progress = (t % 0.6) / 0.6;

          if (model.mesh) {
            // ジャンプ曲線
            const jumpHeight = Math.sin(progress * Math.PI) * 0.5;
            model.mesh.position.y = jumpHeight;

            // 伸縮
            if (progress < 0.2) {
              // 縮む（ジャンプ準備）
              model.mesh.scale.set(1.2, 0.6, 1.2);
            } else if (progress < 0.5) {
              // 伸びる（ジャンプ中）
              model.mesh.scale.set(0.8, 1.3, 0.8);
            } else if (progress < 0.8) {
              // 着地で縮む
              model.mesh.scale.set(1.3, 0.5, 1.3);
            } else {
              // 元に戻る
              const t2 = (progress - 0.8) / 0.2;
              model.mesh.scale.set(
                1.3 - t2 * 0.3,
                0.5 + t2 * 0.5,
                1.3 - t2 * 0.3
              );
            }
          }
        }
      },

      // ========== アイテム ==========
      spin: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          if (model.mesh) {
            model.mesh.rotation.y = t * Math.PI;
          }
        }
      },

      float: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          if (model.mesh) {
            model.mesh.position.y = (model.mesh.userData.baseY || 0) + Math.sin(t * 2) * 0.2;
          }
        }
      },

      beat: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          // 心臓の鼓動
          const beat = t % 1.0;
          let scale = 1;

          if (beat < 0.1) {
            scale = 1 + beat * 3;
          } else if (beat < 0.2) {
            scale = 1.3 - (beat - 0.1) * 2;
          } else if (beat < 0.3) {
            scale = 1.1 + (beat - 0.2) * 2;
          } else if (beat < 0.4) {
            scale = 1.3 - (beat - 0.3) * 3;
          } else {
            scale = 1;
          }

          if (model.mesh) {
            model.mesh.scale.set(scale, scale, scale);
          }
        }
      },

      twinkle: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          const intensity = (Math.sin(t * 8) + 1) / 2 * 0.5 + 0.5;
          model.mesh.traverse(child => {
            if (child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = intensity;
            }
          });
        }
      },

      collect: {
        duration: 0.5,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.5, 1);

          if (model.mesh) {
            // 上昇しながら消える
            model.mesh.position.y = (model.mesh.userData.baseY || 0) + progress * 2;
            model.mesh.scale.set(1 - progress, 1 - progress, 1 - progress);

            // フェードアウト
            model.mesh.traverse(child => {
              if (child.material) {
                child.material.opacity = 1 - progress;
                child.material.transparent = true;
              }
            });
          }
        }
      },

      // ========== 宝箱 ==========
      chestOpen: {
        duration: 1.0,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 1.0, 1);

          if (model.parts.lid) {
            // 蓋を開ける
            model.parts.lid.rotation.x = -progress * Math.PI * 0.7;
          }

          // 中から光が出る
          if (model.parts.glow) {
            model.parts.glow.material.opacity = progress * 0.8;
            model.parts.glow.scale.set(1 + progress, 1 + progress * 2, 1 + progress);
          }
        }
      },

      chestShake: {
        duration: 0.5,
        loop: true,
        update: (model, t, dt) => {
          if (model.mesh) {
            model.mesh.rotation.z = Math.sin(t * 30) * 0.05;
            model.mesh.position.y = Math.abs(Math.sin(t * 15)) * 0.05;
          }
        }
      },

      // ========== 環境オブジェクト ==========
      sway: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // 風に揺れる
          if (model.parts.leaves || model.parts.foliage) {
            const target = model.parts.leaves || model.parts.foliage;
            target.rotation.x = Math.sin(t * 1.5) * 0.05;
            target.rotation.z = Math.sin(t * 1.2 + 0.5) * 0.08;
          }
          if (model.mesh && model.mesh.userData.isGrass) {
            model.mesh.rotation.z = Math.sin(t * 2 + model.mesh.userData.phase) * 0.15;
          }
        }
      },

      burn: {
        duration: 0.5,
        loop: true,
        update: (model, t, dt) => {
          if (model.parts.flame) {
            // 炎のゆらめき
            const flicker = Math.random() * 0.3 + 0.7;
            model.parts.flame.scale.set(flicker, 0.8 + Math.random() * 0.4, flicker);
            model.parts.flame.rotation.y = t * 3;

            // 明るさの変化
            if (model.parts.flame.material) {
              model.parts.flame.material.opacity = 0.6 + Math.random() * 0.4;
            }
          }

          // 光源の揺らぎ
          if (model.parts.light) {
            model.parts.light.intensity = 0.8 + Math.random() * 0.4;
          }
        }
      },

      portalIdle: {
        duration: 4.0,
        loop: true,
        update: (model, t, dt) => {
          if (model.parts.ring) {
            model.parts.ring.rotation.z = t * 0.5;
          }
          if (model.parts.innerRing) {
            model.parts.innerRing.rotation.z = -t * 0.8;
          }
          if (model.parts.vortex) {
            model.parts.vortex.rotation.z = t * 2;
            const pulse = Math.sin(t * 3) * 0.1 + 1;
            model.parts.vortex.scale.set(pulse, pulse, 1);
          }

          // 光のパルス
          model.mesh.traverse(child => {
            if (child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = 0.5 + Math.sin(t * 2) * 0.3;
            }
          });
        }
      },

      crystalGlow: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const intensity = (Math.sin(t * 2) + 1) / 2 * 0.5 + 0.3;
          model.mesh.traverse(child => {
            if (child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = intensity;
            }
          });
        }
      },

      // ========== 犬専用 ==========
      dogIdle: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          // 呼吸のような体の動き
          const breathe = Math.sin(t * 2) * 0.02;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + breathe;
            model.parts.body.scale.x = 1 + Math.sin(t * 2) * 0.02;
            model.parts.body.scale.z = 1 + Math.sin(t * 2 + 0.5) * 0.015;
          }

          // 頭の微妙な動き（周囲を見回す）
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(t * 0.8) * 0.15;
            model.parts.head.rotation.x = Math.sin(t * 1.2) * 0.05;
          }

          // しっぽの揺れ
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(t * 4) * 0.3;
            model.parts.tail.rotation.x = Math.sin(t * 3) * 0.1;
          }

          // 耳のピクピク
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.z = 0.2 + Math.sin(t * 5 + 1) * 0.05;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.z = -0.2 + Math.sin(t * 5) * 0.05;
          }
        }
      },

      dogWalk: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 4足歩行のパターン（対角線の脚が同時に動く）
          // 前左と後右、前右と後左が交互
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.4;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.4;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = -Math.sin(cycle) * 0.4;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -Math.sin(cycle) * 0.4;
          }

          // 体の上下動
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 2)) * 0.05;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.03;
          }

          // 頭の動き
          if (model.parts.head) {
            model.parts.head.position.y = 1.0 + Math.abs(Math.sin(cycle * 2)) * 0.03;
          }

          // しっぽの揺れ
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle * 2) * 0.4;
          }
        }
      },

      dogRun: {
        duration: 0.4,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.4;

          // 走りの脚の動き（より大きく速く）
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.7;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.7;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = -Math.sin(cycle) * 0.7;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -Math.sin(cycle) * 0.7;
          }

          // 体のダイナミックな動き
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 2)) * 0.12;
            model.parts.body.rotation.x = Math.sin(cycle) * 0.08;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.05;
          }

          // 頭を前に
          if (model.parts.head) {
            model.parts.head.rotation.x = -0.15 + Math.sin(cycle * 2) * 0.05;
          }

          // しっぽを水平に
          if (model.parts.tail) {
            model.parts.tail.rotation.x = -0.3;
            model.parts.tail.rotation.y = Math.sin(cycle * 3) * 0.2;
          }
        }
      },

      dogSit: {
        duration: 0.5,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.5, 1);
          const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic

          // 体を下げる
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY - ease * 0.3;
            model.parts.body.rotation.x = -ease * 0.2;
          }

          // 後脚を曲げる
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -ease * 1.2;
            model.parts.backLeftLeg.position.y = 0.75 - ease * 0.2;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = -ease * 1.2;
            model.parts.backRightLeg.position.y = 0.75 - ease * 0.2;
          }

          // 前脚はまっすぐ
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = 0;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = 0;
          }

          // 頭を上げる
          if (model.parts.head) {
            model.parts.head.rotation.x = ease * 0.2;
          }

          // しっぽを床に
          if (model.parts.tail) {
            model.parts.tail.rotation.x = ease * 0.5;
          }
        }
      },

      dogTailWag: {
        duration: 0.4,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.4;

          // しっぽを激しく振る
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle) * 0.8;
            model.parts.tail.rotation.x = -0.2 + Math.abs(Math.sin(cycle)) * 0.3;
          }

          // お尻も少し振れる
          if (model.parts.body) {
            model.parts.body.rotation.y = Math.sin(cycle) * 0.1;
          }

          // 耳がピンと立つ
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.x = 0.2;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.x = 0.2;
          }
        }
      },

      dogBark: {
        duration: 0.6,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 0.6;

          // 口を開閉
          if (model.parts.mouth) {
            const mouthOpen = Math.sin(progress * Math.PI * 4) > 0;
            model.parts.mouth.scale.y = mouthOpen ? 2 : 1;
          }

          // 舌を出す
          if (model.parts.tongue) {
            model.parts.tongue.visible = progress > 0.1 && progress < 0.8;
            model.parts.tongue.position.z = 0.48 + Math.sin(progress * Math.PI * 4) * 0.05;
          }

          // 頭を少し上げる
          if (model.parts.head) {
            model.parts.head.rotation.x = Math.sin(progress * Math.PI * 2) * 0.15;
          }

          // 体が少し跳ねる
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(progress * Math.PI * 3)) * 0.05;
          }

          // 耳がピンと立つ
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.x = 0.3;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.x = 0.3;
          }
        }
      },

      // ========== 馬専用 ==========
      horseIdle: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // ゆっくりとした呼吸
          const breathe = Math.sin(t * 1.2) * 0.02;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + breathe;
          }

          // 頭の小さな動き
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(t * 0.8) * 0.05;
            model.parts.head.rotation.x = 0.15 + Math.sin(t * 1.0) * 0.02;
          }

          // 耳の動き
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.z = 0.15 + Math.sin(t * 2.5) * 0.08;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.z = -0.15 + Math.sin(t * 2.5 + 0.5) * 0.08;
          }

          // しっぽの軽い揺れ
          if (model.parts.tail) {
            model.parts.tail.rotation.x = Math.sin(t * 1.5) * 0.1;
            model.parts.tail.rotation.z = Math.sin(t * 2) * 0.05;
          }

          // たてがみの揺れ
          if (model.parts.mane) {
            model.parts.mane.children.forEach((seg, i) => {
              if (seg.name && seg.name.startsWith('maneSeg')) {
                seg.rotation.z = Math.sin(t * 2 + i * 0.3) * 0.08;
              }
            });
          }
        }
      },

      horseWalk: {
        duration: 1.2,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 1.2;

          // 4拍子の歩行（対角線の脚が同時に動く）
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.35;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.35;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.35;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.35;
          }

          // 体の上下動
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(cycle * 2) * 0.03;
          }

          // 頭の上下
          if (model.parts.head) {
            model.parts.head.rotation.x = 0.15 + Math.sin(cycle * 2) * 0.05;
          }

          // たてがみの揺れ
          if (model.parts.mane) {
            model.parts.mane.children.forEach((seg, i) => {
              if (seg.name && seg.name.startsWith('maneSeg')) {
                seg.rotation.z = Math.sin(cycle * 2 + i * 0.4) * 0.12;
              }
            });
          }

          // しっぽの揺れ
          if (model.parts.tail) {
            model.parts.tail.rotation.x = Math.sin(cycle) * 0.15;
            model.parts.tail.children.forEach((hair, i) => {
              if (hair.name && hair.name.startsWith('tailHair')) {
                hair.rotation.z = Math.sin(cycle * 2 + i * 0.2) * 0.1;
              }
            });
          }
        }
      },

      horseTrot: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 速歩（対角線の脚が同時に上がる2拍子）
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.5;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.5;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
          }

          // 体の大きな上下動
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle)) * 0.08;
          }

          // 頭の動き
          if (model.parts.head) {
            model.parts.head.rotation.x = 0.15 + Math.sin(cycle * 2) * 0.08;
          }

          // たてがみの激しい揺れ
          if (model.parts.mane) {
            model.parts.mane.children.forEach((seg, i) => {
              if (seg.name && seg.name.startsWith('maneSeg')) {
                seg.rotation.z = Math.sin(cycle * 2 + i * 0.5) * 0.2;
                seg.rotation.x = Math.sin(cycle * 2 + i * 0.3) * 0.1;
              }
            });
          }

          // しっぽの揺れ
          if (model.parts.tail) {
            model.parts.tail.rotation.x = Math.sin(cycle) * 0.2;
            model.parts.tail.children.forEach((hair, i) => {
              if (hair.name && hair.name.startsWith('tailHair')) {
                hair.rotation.z = Math.sin(cycle * 2 + i * 0.25) * 0.15;
              }
            });
          }
        }
      },

      horseGallop: {
        duration: 0.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.5;

          // 駆け足（4拍子、前後の脚が交互に）
          // 前脚を揃えて伸ばす
          const frontPhase = Math.sin(cycle);
          const backPhase = Math.sin(cycle - Math.PI * 0.3);

          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = frontPhase * 0.7;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = frontPhase * 0.7 - 0.15;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = backPhase * 0.7;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = backPhase * 0.7 - 0.15;
          }

          // 体の大きな上下動と前傾
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle)) * 0.15;
            model.parts.body.rotation.x = Math.sin(cycle) * 0.05;
          }

          // 首と頭の動き
          if (model.parts.neck) {
            model.parts.neck.rotation.x = -0.3 + Math.sin(cycle) * 0.1;
          }
          if (model.parts.head) {
            model.parts.head.rotation.x = 0.15 + Math.sin(cycle * 2) * 0.1;
          }

          // たてがみの激しい揺れ
          if (model.parts.mane) {
            model.parts.mane.children.forEach((seg, i) => {
              if (seg.name && seg.name.startsWith('maneSeg')) {
                seg.rotation.z = Math.sin(cycle * 2 + i * 0.6) * 0.3;
                seg.rotation.x = Math.sin(cycle * 2 + i * 0.4) * 0.15;
              }
            });
          }

          // しっぽが大きく揺れる
          if (model.parts.tail) {
            model.parts.tail.rotation.x = 0.3 + Math.sin(cycle) * 0.3;
            model.parts.tail.rotation.z = Math.sin(cycle * 1.5) * 0.2;
            model.parts.tail.children.forEach((hair, i) => {
              if (hair.name && hair.name.startsWith('tailHair')) {
                hair.rotation.z = Math.sin(cycle * 2 + i * 0.3) * 0.25;
              }
            });
          }
        }
      },

      horseRear: {
        duration: 1.5,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 1.5, 1);

          // 前足を上げていななく
          if (progress < 0.3) {
            // 準備（少し沈み込む）
            const prep = progress / 0.3;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY - prep * 0.1;
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = prep * 0.2;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = prep * 0.2;
            }
          } else if (progress < 0.7) {
            // 立ち上がり
            const rise = (progress - 0.3) / 0.4;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY + rise * 0.4;
              model.parts.body.rotation.x = -rise * 0.4;
            }
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -rise * 1.2;
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -rise * 1.0;
            }
            if (model.parts.head) {
              model.parts.head.rotation.x = 0.15 - rise * 0.3;
            }
          } else {
            // 降りる
            const down = (progress - 0.7) / 0.3;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY + (1 - down) * 0.4;
              model.parts.body.rotation.x = -(1 - down) * 0.4;
            }
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -(1 - down) * 1.2;
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -(1 - down) * 1.0;
            }
            if (model.parts.head) {
              model.parts.head.rotation.x = 0.15 - (1 - down) * 0.3;
            }
          }

          // たてがみが激しく揺れる
          if (model.parts.mane) {
            const intensity = Math.sin(progress * Math.PI);
            model.parts.mane.children.forEach((seg, i) => {
              if (seg.name && seg.name.startsWith('maneSeg')) {
                seg.rotation.z = Math.sin(t * 8 + i * 0.5) * 0.3 * intensity;
              }
            });
          }
        }
      },

      horseNeigh: {
        duration: 1.0,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 1.0;

          // 頭を上げて口を開ける
          if (model.parts.head) {
            const lift = Math.sin(progress * Math.PI);
            model.parts.head.rotation.x = 0.15 - lift * 0.4;
          }

          // 口を開閉
          if (model.parts.mouth) {
            const mouthOpen = Math.sin(progress * Math.PI * 3) > 0;
            model.parts.mouth.scale.y = mouthOpen ? 3 : 1;
          }

          // 耳を立てる
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.x = 0.3;
            model.parts.leftEar.rotation.z = 0.05;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.x = 0.3;
            model.parts.rightEar.rotation.z = -0.05;
          }

          // 首の動き
          if (model.parts.neck) {
            model.parts.neck.rotation.x = -0.3 - Math.sin(progress * Math.PI) * 0.15;
          }

          // 体が少し揺れる
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(progress * Math.PI * 2) * 0.03;
          }
        }
      },

      // ========== カエル専用 ==========
      frogIdle: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // 喉袋の膨らみ（呼吸）
          if (model.parts.throat) {
            const pulse = 1 + Math.sin(t * 2) * 0.15;
            model.parts.throat.scale.set(pulse, 0.6 * pulse, 0.8);
          }

          // 体の微細な動き
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(t * 1.5) * 0.01;
          }

          // 目のまばたき（たまに）
          const blinkCycle = t % 4;
          if (model.parts.leftEye && model.parts.rightEye) {
            const shouldBlink = blinkCycle > 3.8 && blinkCycle < 4.0;
            const leftEyelid = model.parts.leftEye.children.find(c => c.name === 'eyelid');
            const rightEyelid = model.parts.rightEye.children.find(c => c.name === 'eyelid');
            if (leftEyelid) leftEyelid.visible = shouldBlink;
            if (rightEyelid) rightEyelid.visible = shouldBlink;
          }

          // 頭の動き（周囲を見回す）
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(t * 0.8) * 0.1;
          }
        }
      },

      frogHop: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const progress = (t % 0.8) / 0.8;

          if (progress < 0.2) {
            // 準備（縮む）
            const prep = progress / 0.2;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY - prep * 0.1;
              model.parts.body.scale.y = 0.8 - prep * 0.15;
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = prep * 0.5;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = prep * 0.5;
            }
          } else if (progress < 0.5) {
            // ジャンプ
            const jump = (progress - 0.2) / 0.3;
            const height = Math.sin(jump * Math.PI) * 0.6;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY + height;
              model.parts.body.scale.y = 0.65 + jump * 0.5;
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = 0.5 - jump * 1.2;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = 0.5 - jump * 1.2;
            }
            // 前脚を前に
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -jump * 0.4;
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -jump * 0.4;
            }
          } else {
            // 着地
            const land = (progress - 0.5) / 0.5;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY + (1 - land) * 0.1;
              model.parts.body.scale.y = 1.15 - land * 0.35;
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = -0.7 + land * 0.7;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = -0.7 + land * 0.7;
            }
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -0.4 + land * 0.4;
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -0.4 + land * 0.4;
            }
          }
        }
      },

      frogSwim: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2;

          // 体の波打ち
          if (model.parts.body) {
            model.parts.body.rotation.x = Math.sin(cycle) * 0.1;
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(cycle) * 0.05;
          }

          // 後脚のキック（交互）
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = Math.sin(cycle) * 0.8;
            model.parts.backLeftLeg.rotation.z = 0.3 + Math.sin(cycle) * 0.2;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle + Math.PI) * 0.8;
            model.parts.backRightLeg.rotation.z = -0.3 - Math.sin(cycle + Math.PI) * 0.2;
          }

          // 前脚は体に沿わせる
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = 0.3;
            model.parts.frontLeftLeg.rotation.z = 0.5;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = 0.3;
            model.parts.frontRightLeg.rotation.z = -0.5;
          }
        }
      },

      frogCroak: {
        duration: 1.5,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 1.5;

          // 喉袋を大きく膨らませる
          if (model.parts.throat) {
            const inflate = Math.sin(progress * Math.PI);
            model.parts.throat.scale.set(
              1 + inflate * 1.5,
              0.6 + inflate * 1.0,
              0.8 + inflate * 0.8
            );
          }

          // 口を開く
          if (model.parts.mouth) {
            const open = Math.sin(progress * Math.PI * 3) > 0;
            model.parts.mouth.scale.y = open ? 1.5 : 1;
          }

          // 体が少し膨らむ
          if (model.parts.body) {
            const swell = Math.sin(progress * Math.PI) * 0.1;
            model.parts.body.scale.set(1.1 + swell, 0.8 + swell * 0.5, 1.3);
          }

          // 頭を上げる
          if (model.parts.head) {
            model.parts.head.rotation.x = -Math.sin(progress * Math.PI) * 0.2;
          }
        }
      },

      frogTongue: {
        duration: 0.4,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 0.4;

          // 舌を出す
          if (model.parts.tongue) {
            if (progress < 0.3) {
              // 舌を伸ばす
              const extend = progress / 0.3;
              model.parts.tongue.visible = true;
              model.parts.tongue.scale.z = extend * 2;
              model.parts.tongue.position.z = 0.2 + extend * 0.5;
            } else if (progress < 0.5) {
              // 最大
              model.parts.tongue.scale.z = 2;
            } else {
              // 戻る
              const retract = (progress - 0.5) / 0.5;
              model.parts.tongue.scale.z = 2 * (1 - retract);
              model.parts.tongue.position.z = 0.7 - retract * 0.5;
              if (retract > 0.9) {
                model.parts.tongue.visible = false;
              }
            }
          }

          // 頭を前に突き出す
          if (model.parts.head) {
            const thrust = Math.sin(progress * Math.PI);
            model.parts.head.position.z = 0.45 + thrust * 0.1;
          }
        }
      },

      frogSit: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          // 座り姿勢（ほぼ動かない）
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY - 0.05;
          }

          // 喉袋の小さな動き
          if (model.parts.throat) {
            const pulse = 1 + Math.sin(t * 2) * 0.08;
            model.parts.throat.scale.set(pulse, 0.6 * pulse, 0.8);
          }

          // まばたき
          const blinkCycle = t % 3;
          if (model.parts.leftEye && model.parts.rightEye) {
            const shouldBlink = blinkCycle > 2.7 && blinkCycle < 2.9;
            const leftEyelid = model.parts.leftEye.children.find(c => c.name === 'eyelid');
            const rightEyelid = model.parts.rightEye.children.find(c => c.name === 'eyelid');
            if (leftEyelid) leftEyelid.visible = shouldBlink;
            if (rightEyelid) rightEyelid.visible = shouldBlink;
          }

          // 頭をゆっくり左右に
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(t * 0.5) * 0.15;
          }
        }
      },

      // ========== 猫専用 ==========
      catIdle: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // 呼吸
          const breathe = Math.sin(t * 1.5) * 0.015;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + breathe;
            model.parts.body.scale.x = 1 + Math.sin(t * 1.5) * 0.015;
          }

          // 頭の動き（ゆっくり見回す）
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(t * 0.5) * 0.2;
            model.parts.head.rotation.x = Math.sin(t * 0.8) * 0.08;
          }

          // しっぽのゆらゆら（猫らしくゆっくり）
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(t * 1.2) * 0.4;
            model.parts.tail.rotation.x = Math.sin(t * 0.8) * 0.15;
          }

          // しっぽセグメントの波打ち
          model.mesh.traverse(child => {
            if (child.name && child.name.startsWith('tailSeg_')) {
              const index = parseInt(child.name.split('_')[1]);
              const wave = Math.sin(t * 2 - index * 0.3) * 0.05 * (index / 12);
              child.position.x += wave;
            }
          });

          // 耳のピクピク（ランダムに）
          const earTwitch = Math.sin(t * 8) > 0.95;
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.z = 0.25 + (earTwitch ? 0.1 : 0);
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.z = -0.25 - (earTwitch ? 0.1 : 0);
          }

          // 鈴の揺れ
          if (model.parts.bell) {
            model.parts.bell.position.x = Math.sin(t * 3) * 0.01;
          }
        }
      },

      catWalk: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 1.0;

          // 優雅な4足歩行
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.35;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.35;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = -Math.sin(cycle) * 0.35;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -Math.sin(cycle) * 0.35;
          }

          // 体の滑らかな動き
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 2)) * 0.03;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.02;
            model.parts.body.rotation.y = Math.sin(cycle) * 0.03;
          }

          // 頭は安定
          if (model.parts.head) {
            model.parts.head.rotation.y = -Math.sin(cycle) * 0.03;
          }

          // しっぽは上を向いて揺れる
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle * 1.5) * 0.3;
            model.parts.tail.rotation.x = -0.2;
          }
        }
      },

      catRun: {
        duration: 0.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.5;

          // 走りの脚
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = Math.sin(cycle) * 0.6;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = Math.sin(cycle) * 0.6;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = -Math.sin(cycle) * 0.6;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -Math.sin(cycle) * 0.6;
          }

          // 体が伸び縮み
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 2)) * 0.1;
            model.parts.body.scale.z = 1.3 + Math.sin(cycle) * 0.1;
            model.parts.body.rotation.x = Math.sin(cycle) * 0.1;
          }

          // しっぽを水平に
          if (model.parts.tail) {
            model.parts.tail.rotation.x = -0.5;
            model.parts.tail.rotation.y = Math.sin(cycle * 2) * 0.15;
          }
        }
      },

      catSit: {
        duration: 0.6,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.6, 1);
          const ease = 1 - Math.pow(1 - progress, 3);

          // 体を下げて丸める
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY - ease * 0.25;
            model.parts.body.rotation.x = ease * 0.15;
          }

          // 後脚を折りたたむ
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -ease * 1.5;
            model.parts.backLeftLeg.position.y = 0.65 - ease * 0.15;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = -ease * 1.5;
            model.parts.backRightLeg.position.y = 0.65 - ease * 0.15;
          }

          // 前脚を揃える
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = ease * 0.1;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = ease * 0.1;
          }

          // しっぽを体に巻きつける
          if (model.parts.tail) {
            model.parts.tail.rotation.y = ease * 1.2;
            model.parts.tail.rotation.x = ease * 0.3;
          }

          // 頭を上げる
          if (model.parts.head) {
            model.parts.head.rotation.x = ease * 0.1;
          }
        }
      },

      catSleep: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          // 丸まって寝る姿勢
          const breathe = Math.sin(t * 0.8) * 0.02;

          if (model.parts.body) {
            model.parts.body.position.y = 0.35 + breathe;
            model.parts.body.scale.set(1, 0.6, 1.1);
            model.parts.body.rotation.x = 0.3;
          }

          // 脚を折りたたむ
          if (model.parts.frontLeftLeg) {
            model.parts.frontLeftLeg.rotation.x = -1.2;
            model.parts.frontLeftLeg.position.y = 0.4;
          }
          if (model.parts.frontRightLeg) {
            model.parts.frontRightLeg.rotation.x = -1.2;
            model.parts.frontRightLeg.position.y = 0.4;
          }
          if (model.parts.backLeftLeg) {
            model.parts.backLeftLeg.rotation.x = -1.8;
            model.parts.backLeftLeg.position.y = 0.4;
          }
          if (model.parts.backRightLeg) {
            model.parts.backRightLeg.rotation.x = -1.8;
            model.parts.backRightLeg.position.y = 0.4;
          }

          // 頭を体に埋める
          if (model.parts.head) {
            model.parts.head.position.y = 0.5;
            model.parts.head.position.z = 0.3;
            model.parts.head.rotation.x = 0.3;
          }

          // しっぽで顔を覆う
          if (model.parts.tail) {
            model.parts.tail.rotation.y = 1.5 + Math.sin(t * 0.5) * 0.1;
            model.parts.tail.rotation.x = 0.5;
            model.parts.tail.position.y = 0.3;
          }

          // 耳を寝かせる
          if (model.parts.leftEar) {
            model.parts.leftEar.rotation.x = -0.3;
            model.parts.leftEar.rotation.z = 0.5;
          }
          if (model.parts.rightEar) {
            model.parts.rightEar.rotation.x = -0.3;
            model.parts.rightEar.rotation.z = -0.5;
          }
        }
      },

      catPounce: {
        duration: 0.8,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 0.8;

          if (progress < 0.3) {
            // 準備姿勢（かがむ）
            const crouch = progress / 0.3;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY - crouch * 0.2;
              model.parts.body.rotation.x = -crouch * 0.2;
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = -crouch * 0.8;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = -crouch * 0.8;
            }
            // しっぽをピンと
            if (model.parts.tail) {
              model.parts.tail.rotation.x = crouch * 0.3;
            }
          } else if (progress < 0.5) {
            // ジャンプ
            const jump = (progress - 0.3) / 0.2;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY - 0.2 + jump * 0.6;
              model.parts.body.rotation.x = -0.2 + jump * 0.4;
            }
            // 前脚を前に
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -jump * 0.8;
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -jump * 0.8;
            }
            // 後脚を伸ばす
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = -0.8 + jump * 1.2;
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = -0.8 + jump * 1.2;
            }
          } else {
            // 着地
            const land = (progress - 0.5) / 0.5;
            if (model.parts.body) {
              model.parts.body.position.y = model.parts.body.userData.baseY + 0.4 - land * 0.4;
              model.parts.body.rotation.x = 0.2 * (1 - land);
            }
            // 脚を戻す
            if (model.parts.frontLeftLeg) {
              model.parts.frontLeftLeg.rotation.x = -0.8 * (1 - land);
            }
            if (model.parts.frontRightLeg) {
              model.parts.frontRightLeg.rotation.x = -0.8 * (1 - land);
            }
            if (model.parts.backLeftLeg) {
              model.parts.backLeftLeg.rotation.x = 0.4 * (1 - land);
            }
            if (model.parts.backRightLeg) {
              model.parts.backRightLeg.rotation.x = 0.4 * (1 - land);
            }
          }
        }
      },

      // ========== ゴースト専用 ==========
      ghostFloat: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // ふわふわ浮遊
          const floatOffset = model.mesh.userData.floatOffset || 0;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(t * 1.5 + floatOffset) * 0.3;
            model.parts.body.rotation.y = Math.sin(t * 0.5) * 0.1;
            model.parts.body.rotation.z = Math.sin(t * 0.8 + 0.5) * 0.05;
          }

          // 裾の揺れ
          model.mesh.traverse(child => {
            if (child.name && child.name.startsWith('tail_')) {
              const index = parseInt(child.name.split('_')[1]);
              child.rotation.x = Math.PI + Math.sin(t * 2 + index * 0.5) * 0.2;
              child.rotation.z = Math.sin(t * 1.5 + index * 0.3) * 0.15;
            }
          });

          // 腕の揺らめき
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = 0.8 + Math.sin(t * 1.2) * 0.2;
            model.parts.leftArm.rotation.x = -0.3 + Math.sin(t * 0.9) * 0.1;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = -0.8 + Math.sin(t * 1.2 + 0.5) * 0.2;
            model.parts.rightArm.rotation.x = -0.3 + Math.sin(t * 0.9 + 0.5) * 0.1;
          }

          // オーラのパルス
          if (model.parts.aura) {
            const pulse = 1 + Math.sin(t * 2) * 0.1;
            model.parts.aura.scale.set(pulse, pulse * 1.5, pulse);
            model.parts.aura.material.opacity = 0.08 + Math.sin(t * 3) * 0.04;
          }

          // 目の光の明滅
          if (model.parts.leftEye || model.parts.rightEye) {
            const eyeIntensity = 1.0 + Math.sin(t * 4) * 0.3;
            [model.parts.leftEye, model.parts.rightEye].forEach(eye => {
              if (eye) {
                eye.traverse(child => {
                  if (child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = eyeIntensity;
                  }
                });
              }
            });
          }
        }
      },

      // ========== インクリング/オクトリング専用 ==========
      inklingIdle: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          // 軽やかな待機モーション
          const bounce = Math.sin(t * 3) * 0.03;
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + bounce;
          }

          // 頭の軽い揺れ
          if (model.parts.head) {
            model.parts.head.rotation.z = Math.sin(t * 1.5) * 0.05;
            model.parts.head.rotation.y = Math.sin(t * 0.8) * 0.08;
          }

          // 腕の自然な揺れ
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = 0.1 + Math.sin(t * 1.2) * 0.05;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = -0.1 + Math.sin(t * 1.2 + 0.5) * 0.05;
          }
        }
      },

      inklingWalk: {
        duration: 0.6,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.6;

          // 軽快な歩行
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = Math.sin(cycle) * 0.6;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = -Math.sin(cycle) * 0.6;
          }

          // 腕振り
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.sin(cycle) * 0.4;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = Math.sin(cycle) * 0.4;
          }

          // 体のバウンス
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle)) * 0.08;
          }

          // 頭の揺れ
          if (model.parts.head) {
            model.parts.head.rotation.x = Math.sin(cycle * 2) * 0.05;
          }
        }
      },

      inklingShoot: {
        duration: 0.4,
        loop: false,
        update: (model, t, dt) => {
          const progress = Math.min(t / 0.4, 1);

          // 右腕でシューター構え
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -1.2;
            model.parts.rightArm.rotation.z = -0.3;

            // 発射時の反動
            if (progress > 0.2 && progress < 0.5) {
              const recoil = Math.sin((progress - 0.2) / 0.3 * Math.PI) * 0.3;
              model.parts.rightArm.rotation.x = -1.2 + recoil;
            }
          }

          // 体を少し前傾
          if (model.parts.body) {
            model.parts.body.rotation.x = 0.1;
          }
        }
      },

      inklingVictory: {
        duration: 1.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2;

          // 元気なジャンプ
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.abs(Math.sin(cycle * 1.5)) * 0.25;
          }

          // 両腕を上げて振る
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -2.8 + Math.sin(cycle * 3) * 0.4;
            model.parts.leftArm.rotation.z = 0.4;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -2.8 + Math.sin(cycle * 3 + Math.PI) * 0.4;
            model.parts.rightArm.rotation.z = -0.4;
          }

          // 頭を左右に振る
          if (model.parts.head) {
            model.parts.head.rotation.z = Math.sin(cycle * 2) * 0.15;
          }
        }
      },

      // ========== イカ専用 ==========
      squidIdle: {
        duration: 2.5,
        loop: true,
        update: (model, t, dt) => {
          // ゆらゆら浮遊
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(t * 1.5) * 0.1;
            model.parts.body.scale.x = 1 + Math.sin(t * 2) * 0.05;
            model.parts.body.scale.z = 1 + Math.sin(t * 2 + 0.5) * 0.05;
          }

          // 触手のうねり
          model.mesh.traverse(child => {
            if (child.userData && child.userData.isTentacle) {
              const offset = child.userData.tentacleIndex || 0;
              child.rotation.x = Math.sin(t * 1.5 + offset) * 0.2;
              child.rotation.z = Math.sin(t * 1.2 + offset * 0.5) * 0.15;
            }
          });
        }
      },

      squidSwim: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 体の収縮・膨張（推進）
          if (model.parts.body) {
            const pulse = Math.sin(cycle);
            model.parts.body.scale.y = 1 + pulse * 0.15;
            model.parts.body.scale.x = 1 - pulse * 0.08;
            model.parts.body.scale.z = 1 - pulse * 0.08;
          }

          // 高速移動の上下動
          if (model.mesh) {
            model.mesh.position.y = model.mesh.userData.baseY + Math.sin(cycle * 2) * 0.05;
          }
        }
      },

      // ========== タコ専用 ==========
      octopusIdle: {
        duration: 3.0,
        loop: true,
        update: (model, t, dt) => {
          // ゆったり浮遊
          if (model.parts.body) {
            model.parts.body.position.y = model.parts.body.userData.baseY + Math.sin(t * 1.2) * 0.12;
            model.parts.body.rotation.y = Math.sin(t * 0.5) * 0.1;
          }

          // 8本の触手を個別に動かす
          for (let i = 0; i < 8; i++) {
            const tentacle = model.parts[`tentacle${i}`];
            if (tentacle) {
              const phase = (i / 8) * Math.PI * 2;
              tentacle.rotation.x = Math.sin(t * 1.5 + phase) * 0.2;
              tentacle.rotation.z = Math.sin(t * 1.2 + phase * 0.5) * 0.15;
            }
          }
        }
      },

      octopusSwim: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 1.0;

          // 水を吹き出す動き
          if (model.parts.body) {
            const pulse = Math.sin(cycle);
            model.parts.body.scale.y = 0.85 + pulse * 0.1;
            model.parts.body.scale.x = 1 - pulse * 0.05;
          }

          // 触手を後ろに流す
          for (let i = 0; i < 8; i++) {
            const tentacle = model.parts[`tentacle${i}`];
            if (tentacle) {
              const phase = (i / 8) * Math.PI * 2;
              tentacle.rotation.x = 0.3 + Math.sin(cycle + phase) * 0.2;
            }
          }
        }
      },

      octopusWave: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2;

          // 触手でウェーブ
          for (let i = 0; i < 8; i++) {
            const tentacle = model.parts[`tentacle${i}`];
            if (tentacle) {
              const phase = (i / 8) * Math.PI * 2;
              const wave = Math.sin(cycle * 2 - phase);
              tentacle.rotation.y = wave * 0.3;
              tentacle.position.y = 0.4 + wave * 0.1;
            }
          }
        }
      },

      // ========== マリオ アニメーション ==========
      marioIdle: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 2.0;

          // 軽い呼吸
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.2;
            model.parts.body.position.y = baseY + Math.sin(cycle) * 0.02;
            model.parts.body.scale.x = 1 + Math.sin(cycle) * 0.01;
            model.parts.body.scale.z = 1 - Math.sin(cycle) * 0.01;
          }

          // 頭の軽い動き
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(cycle * 0.5) * 0.05;
          }

          // 腕の軽いスイング
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = Math.sin(cycle) * 0.05;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.sin(cycle) * 0.05;
          }
        }
      },

      marioWalk: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 体の上下動
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.2;
            model.parts.body.position.y = baseY + Math.abs(Math.sin(cycle)) * 0.08;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.03;
          }

          // 頭の安定
          if (model.parts.head) {
            model.parts.head.rotation.z = -Math.sin(cycle) * 0.02;
          }

          // 腕振り
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = Math.sin(cycle) * 0.5;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.sin(cycle) * 0.5;
          }

          // 脚の動き
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = -Math.sin(cycle) * 0.5;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = Math.sin(cycle) * 0.5;
          }
        }
      },

      marioRun: {
        duration: 0.4,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.4;

          // 体の大きな上下動
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.2;
            model.parts.body.position.y = baseY + Math.abs(Math.sin(cycle)) * 0.15;
            model.parts.body.rotation.x = 0.1; // 前傾姿勢
            model.parts.body.rotation.z = Math.sin(cycle) * 0.05;
          }

          // 頭の安定
          if (model.parts.head) {
            model.parts.head.rotation.x = -0.05;
          }

          // 激しい腕振り
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = Math.sin(cycle) * 0.8;
            model.parts.leftArm.rotation.z = -0.2;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.sin(cycle) * 0.8;
            model.parts.rightArm.rotation.z = 0.2;
          }

          // 大きな脚の動き
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = -Math.sin(cycle) * 0.9;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = Math.sin(cycle) * 0.9;
          }
        }
      },

      marioJump: {
        duration: 1.0,
        loop: false,
        update: (model, t, dt) => {
          const jumpProgress = t / 1.0;
          const jumpHeight = Math.sin(jumpProgress * Math.PI) * 1.5;

          // 体全体のジャンプ
          if (model.mesh) {
            const baseY = model.mesh.userData?.baseY || 0;
            model.mesh.position.y = baseY + jumpHeight;
          }

          // ジャンプ中のポーズ
          if (model.parts.body) {
            model.parts.body.rotation.x = jumpProgress < 0.5 ? -0.1 : 0.1;
          }

          // 腕を上げる
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.PI * 0.3 * Math.sin(jumpProgress * Math.PI);
            model.parts.leftArm.rotation.z = -0.3;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.PI * 0.5 * Math.sin(jumpProgress * Math.PI);
            model.parts.rightArm.rotation.z = 0.3;
          }

          // 脚を曲げる
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = 0.3 * Math.sin(jumpProgress * Math.PI);
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = -0.2 * Math.sin(jumpProgress * Math.PI);
          }
        }
      },

      marioVictory: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.5;
          const jumpCycle = t * Math.PI * 2 / 2.0;

          // 小さなジャンプ
          if (model.mesh) {
            const baseY = model.mesh.userData?.baseY || 0;
            model.mesh.position.y = baseY + Math.abs(Math.sin(jumpCycle)) * 0.3;
          }

          // 体の動き
          if (model.parts.body) {
            model.parts.body.rotation.y = Math.sin(cycle * 0.25) * 0.1;
          }

          // 両手を上げて振る
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.PI * 0.6;
            model.parts.leftArm.rotation.z = -0.3 + Math.sin(cycle) * 0.2;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.PI * 0.6;
            model.parts.rightArm.rotation.z = 0.3 - Math.sin(cycle) * 0.2;
          }

          // 頭を左右に振る
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(cycle * 0.5) * 0.15;
            model.parts.head.rotation.z = Math.sin(cycle * 0.5) * 0.05;
          }
        }
      },

      // ========== ピーチ姫 アニメーション ==========
      peachIdle: {
        duration: 2.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 2.5;

          // 優雅な呼吸
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.5;
            model.parts.body.position.y = baseY + Math.sin(cycle) * 0.015;
          }

          // 頭の軽い傾き
          if (model.parts.head) {
            model.parts.head.rotation.z = Math.sin(cycle * 0.5) * 0.03;
            model.parts.head.rotation.y = Math.sin(cycle * 0.3) * 0.02;
          }

          // 腕の優雅な動き
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.15 + Math.sin(cycle) * 0.03;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.15 - Math.sin(cycle) * 0.03;
          }

          // ドレスのスカートが軽く揺れる
          if (model.parts.body) {
            model.parts.body.rotation.y = Math.sin(cycle * 0.5) * 0.02;
          }
        }
      },

      peachWalk: {
        duration: 1.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 1.0;

          // 優雅な上下動（小さめ）
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.5;
            model.parts.body.position.y = baseY + Math.abs(Math.sin(cycle)) * 0.04;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.02;
          }

          // 腕振り（控えめ）
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = Math.sin(cycle) * 0.2;
            model.parts.leftArm.rotation.z = -0.2;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.sin(cycle) * 0.2;
            model.parts.rightArm.rotation.z = 0.2;
          }

          // 頭の安定
          if (model.parts.head) {
            model.parts.head.rotation.z = -Math.sin(cycle) * 0.015;
          }
        }
      },

      peachWave: {
        duration: 1.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.4;

          // 右腕を上げて振る
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.PI * 0.6;
            model.parts.rightArm.rotation.z = 0.5 + Math.sin(cycle) * 0.3;
          }

          // 左腕は自然に
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.2;
          }

          // 体を少し傾ける
          if (model.parts.body) {
            model.parts.body.rotation.z = -0.05;
          }

          // 頭を傾けて微笑む
          if (model.parts.head) {
            model.parts.head.rotation.z = -0.1;
            model.parts.head.rotation.y = 0.1;
          }
        }
      },

      peachFloat: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 2.0;

          // ふわふわ浮遊
          if (model.mesh) {
            const baseY = model.mesh.userData?.baseY || 0;
            model.mesh.position.y = baseY + 0.5 + Math.sin(cycle) * 0.2;
          }

          // 体を少し後ろに傾ける
          if (model.parts.body) {
            model.parts.body.rotation.x = -0.1;
          }

          // ドレスが広がる
          if (model.parts.body) {
            model.parts.body.scale.x = 1.05;
            model.parts.body.scale.z = 1.05;
          }

          // 腕を広げる
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.5 + Math.sin(cycle * 0.5) * 0.1;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.5 - Math.sin(cycle * 0.5) * 0.1;
          }
        }
      },

      peachVictory: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;
          const slowCycle = t * Math.PI * 2 / 2.0;

          // 軽くジャンプ
          if (model.mesh) {
            const baseY = model.mesh.userData?.baseY || 0;
            model.mesh.position.y = baseY + Math.abs(Math.sin(slowCycle)) * 0.15;
          }

          // くるっと回転
          if (model.mesh) {
            const baseRotY = model.mesh.userData?.baseRotY || 0;
            model.mesh.rotation.y = baseRotY + (t / 2.0) * Math.PI * 2;
          }

          // 両手を胸の前で合わせる
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -0.3;
            model.parts.leftArm.rotation.z = 0.5;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -0.3;
            model.parts.rightArm.rotation.z = -0.5;
          }

          // 嬉しそうに頭を傾ける
          if (model.parts.head) {
            model.parts.head.rotation.z = Math.sin(cycle) * 0.1;
          }
        }
      },

      // ========== クッパ アニメーション ==========
      bowserIdle: {
        duration: 2.0,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 2.0;

          // 重厚な呼吸
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.2;
            model.parts.body.position.y = baseY + Math.sin(cycle) * 0.03;
            model.parts.body.scale.x = 1 + Math.sin(cycle) * 0.02;
            model.parts.body.scale.z = 1 - Math.sin(cycle) * 0.015;
          }

          // 頭をゆっくり動かす
          if (model.parts.head) {
            model.parts.head.rotation.y = Math.sin(cycle * 0.5) * 0.1;
          }

          // 尻尾を揺らす
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle) * 0.15;
          }

          // 腕を少し動かす
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.2 + Math.sin(cycle) * 0.05;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.2 - Math.sin(cycle) * 0.05;
          }
        }
      },

      bowserWalk: {
        duration: 0.8,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 0.8;

          // 重い足取り
          if (model.parts.body) {
            const baseY = model.parts.body.userData?.baseY || 1.2;
            model.parts.body.position.y = baseY + Math.abs(Math.sin(cycle)) * 0.06;
            model.parts.body.rotation.z = Math.sin(cycle) * 0.04;
          }

          // 頭を安定させる
          if (model.parts.head) {
            model.parts.head.rotation.z = -Math.sin(cycle) * 0.02;
          }

          // 腕振り
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = Math.sin(cycle) * 0.4;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.x = -Math.sin(cycle) * 0.4;
          }

          // 脚の動き
          if (model.parts.leftLeg) {
            model.parts.leftLeg.rotation.x = -Math.sin(cycle) * 0.4;
          }
          if (model.parts.rightLeg) {
            model.parts.rightLeg.rotation.x = Math.sin(cycle) * 0.4;
          }

          // 尻尾を揺らす
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle * 2) * 0.2;
          }
        }
      },

      bowserRoar: {
        duration: 1.5,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 1.5;
          const roarIntensity = Math.sin(progress * Math.PI);

          // 体を後ろに反らす
          if (model.parts.body) {
            model.parts.body.rotation.x = -0.2 * roarIntensity;
          }

          // 頭を上げて咆哮
          if (model.parts.head) {
            model.parts.head.rotation.x = -0.4 * roarIntensity;
          }

          // 両腕を広げる
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.5 - 0.5 * roarIntensity;
            model.parts.leftArm.rotation.x = -0.3 * roarIntensity;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.5 + 0.5 * roarIntensity;
            model.parts.rightArm.rotation.x = -0.3 * roarIntensity;
          }

          // 尻尾を立てる
          if (model.parts.tail) {
            model.parts.tail.rotation.x = -0.3 * roarIntensity;
          }
        }
      },

      bowserBreath: {
        duration: 2.0,
        loop: false,
        update: (model, t, dt) => {
          const progress = t / 2.0;

          // 息を吸う（前半）→ 吐く（後半）
          if (progress < 0.4) {
            // 息を吸う
            const inhale = progress / 0.4;
            if (model.parts.body) {
              model.parts.body.scale.x = 1 + inhale * 0.1;
              model.parts.body.scale.z = 1 + inhale * 0.08;
            }
            if (model.parts.head) {
              model.parts.head.rotation.x = inhale * 0.2;
            }
          } else {
            // 火を吐く
            const exhale = (progress - 0.4) / 0.6;
            if (model.parts.body) {
              model.parts.body.scale.x = 1.1 - exhale * 0.15;
              model.parts.body.scale.z = 1.08 - exhale * 0.1;
            }
            if (model.parts.head) {
              model.parts.head.rotation.x = 0.2 - exhale * 0.4;
            }
          }

          // 腕を構える
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.z = -0.4;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.4;
          }
        }
      },

      bowserVictory: {
        duration: 2.5,
        loop: true,
        update: (model, t, dt) => {
          const cycle = t * Math.PI * 2 / 1.0;
          const slowCycle = t * Math.PI * 2 / 2.5;

          // 勝ち誇った姿勢
          if (model.mesh) {
            const baseY = model.mesh.userData?.baseY || 0;
            model.mesh.position.y = baseY + Math.abs(Math.sin(slowCycle)) * 0.1;
          }

          // 笑うように体を揺らす
          if (model.parts.body) {
            model.parts.body.rotation.z = Math.sin(cycle) * 0.05;
          }

          // 頭を上げて笑う
          if (model.parts.head) {
            model.parts.head.rotation.x = -0.15;
            model.parts.head.rotation.z = Math.sin(cycle) * 0.08;
          }

          // 片腕を振り上げる
          if (model.parts.leftArm) {
            model.parts.leftArm.rotation.x = -Math.PI * 0.4;
            model.parts.leftArm.rotation.z = -0.3 + Math.sin(cycle) * 0.15;
          }
          if (model.parts.rightArm) {
            model.parts.rightArm.rotation.z = 0.3;
          }

          // 尻尾を振る
          if (model.parts.tail) {
            model.parts.tail.rotation.y = Math.sin(cycle * 1.5) * 0.3;
          }
        }
      }
    };
  }

  /**
   * アニメーション再生開始
   */
  play(model, animationName) {
    model.animationTime = 0;

    // ベース値を保存
    if (model.parts.body && model.parts.body.position) {
      model.parts.body.userData = model.parts.body.userData || {};
      model.parts.body.userData.baseY = model.parts.body.userData.baseY ?? model.parts.body.position.y;
    }
    if (model.mesh) {
      model.mesh.userData = model.mesh.userData || {};
      model.mesh.userData.baseY = model.mesh.userData.baseY ?? model.mesh.position.y;
      model.mesh.userData.baseRotY = model.mesh.userData.baseRotY ?? model.mesh.rotation.y;
    }
  }

  /**
   * アニメーション更新
   */
  update(model, animationName, time, deltaTime) {
    const anim = this.animations[animationName];
    if (!anim) return;

    // ループ処理
    let t = time;
    if (anim.loop) {
      t = time % anim.duration;
    } else if (time > anim.duration) {
      t = anim.duration;
    }

    anim.update(model, t, deltaTime);
  }

  /**
   * アニメーション定義を追加
   */
  register(name, definition) {
    this.animations[name] = definition;
  }

  /**
   * 利用可能なアニメーション一覧
   */
  getAvailableAnimations() {
    return Object.keys(this.animations);
  }
}

export default AnimationSystem;
