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
