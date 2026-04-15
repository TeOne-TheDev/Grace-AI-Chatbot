function evaluateCycleAfterTimeSkip(bot, daysAdvanced) {
    if (!bot.cycleData) initCycleData(bot);
    
    // Skip cycle evaluation for Male bots
    const isFemale = (bot.gender || '').toLowerCase().includes('female') || 
                     (bot.gender || '').toLowerCase().includes('woman') || 
                     (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return;
    
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);

    
    const cycleDay = getCurrentCycleDay(bot);
    
    if (cd.pregnant) {
        const weeks = getEffectivePregnancyWeek(bot);
        const _isAlwaysOverdue = (bot.geneticTraits || []).includes('Always Overdue');
        const _isEarlyBirth = (bot.geneticTraits || []).includes('Early Birth');
        
        // Early Birth: can go into labor as early as week 28 (premature)
        // Linear progression: week 28 = 12.5%, week 35 = 100%
        if (_isEarlyBirth && weeks >= 28 && weeks < 37 && !cd.laborStarted) {
            const earlyLaborChance = (weeks - 27) * 0.125; // 12.5% at week 28, 100% at week 35
            if (Math.random() < earlyLaborChance) {
                cd.laborStarted = true;
                cd.laborStartedRealTime = Date.now();
                cd.laborVirtualDay = virtualDay;
                cd.laborVirtualMinutes = Math.max(0, getVirtualMinutes(bot) - 1); 
                addReproEvent(bot, '\uD83D\uDEA8 PREMATURE LABOR has begun! Early birth risk - contractions starting at week ' + weeks + '...');
            }
        }
        
        const _laborStartWeek = _isAlwaysOverdue ? 43 : 40;
        const _laborBaseWeek  = _isAlwaysOverdue ? 42 : 39;

        if (weeks >= _laborStartWeek && !cd.laborStarted) {
            if (Math.random() < 0.4 * (weeks - _laborBaseWeek)) {
                cd.laborStarted = true;
                cd.laborStartedRealTime = Date.now();
                cd.laborVirtualDay = virtualDay;
                cd.laborVirtualMinutes = Math.max(0, getVirtualMinutes(bot) - 1); 
                addReproEvent(bot, '\uD83D\uDEA8 Labor has begun! Contractions starting...');
                // Initialize individual delivery progress
                if (typeof initDeliveryProgress === 'function') {
                    initDeliveryProgress(bot);
                }
            }
        }
        
        // Parasite pregnancy: trigger labor immediately after time skip if ready (day >= 12)
        if (cd.isParasitePregnancy && !cd.laborStarted) {
            const parasiteDays = getParasiteWeek(bot);
            if (parasiteDays >= 12) {
                cd.laborStarted = true;
                cd.laborStartedRealTime = Date.now();
                cd.laborVirtualDay = virtualDay;
                cd.laborVirtualMinutes = getVirtualMinutes(bot);
                addReproEvent(bot, '\u26A0\uFE0F Parasite preparing to emerge - day ' + parasiteDays + '/15. EMERGENCE IMMINENT.');
                // Initialize individual delivery progress for parasite emergence
                if (typeof initDeliveryProgress === 'function') {
                    initDeliveryProgress(bot);
                }
            }
        }
        
    } else {
        
        
        if (cycleDay <= PERIOD_LENGTH) {
            addReproEvent(bot, `\uD83D\uDC79 New menstrual cycle began (Cycle Day ${cycleDay})`);
        }
    }
    saveBots();
}

function updateReproductiveStatus(bot) {
    if (!bot.cycleData) return;
    
    // Skip reproductive status updates for Male bots
    const isFemale = (bot.gender || '').toLowerCase().includes('female') || 
                     (bot.gender || '').toLowerCase().includes('woman') || 
                     (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) return;
    
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);

    
    if (cd.postpartumStartDay !== null && !cd.pregnant) {
        const postDays = virtualDay - cd.postpartumStartDay;
        if (postDays < POSTPARTUM_DAYS) {
            let statusLabel, statusIcon, statusColor;

            if (cd.isParasitePregnancy) {
                statusLabel = 'Post-Parasite Recovery';
                statusIcon = '🩹';
                statusColor = '#10b981';
            } else if (cd.isMonsterPregnancy) {
                statusLabel = 'Post-Monster Trauma';
                statusIcon = '💔';
                statusColor = '#ef4444';
            } else {
                statusLabel = 'Postpartum Recovery';
                statusIcon = '🍼';
                statusColor = '#f9a8d4';
            }

        bot.currentStatus = { label: statusLabel, icon: statusIcon, color: statusColor };
        saveBots();
        return;
    }

    // Additional status checks for pregnancy-related conditions
    if (cd.pregnant) {
        const weeks = getPregnancyWeek(bot) || 0;
        const fetusCount = (cd.fetuses || []).length;

        // Check for special conditions that override base pregnancy status
        if (cd.isParasitePregnancy && getParasiteWeek(bot) > 12) {
            bot.currentStatus = { label: 'Critical Parasite State', icon: '💀', color: '#dc2626' };
        } else if (cd.isMonsterPregnancy && getMonsterPregnancyWeek(bot) > 7) {
            bot.currentStatus = { label: 'Dangerous Monster State', icon: '☠️', color: '#dc2626' };
        }
        // These override the basic pregnancy statuses above
        saveBots();
        return;
    }
        
        cd.postpartumStartDay = null;
        cd.birthVirtualDay = null;  
        cd.newbornPresent = false;
        cd.laborStarted = false;
        cd.laborVirtualDay = null;
        cd.waterBroke = false;
        cd.laborProgress = null;
    }


    if (cd.laborStarted && !cd.birthVirtualDay) {
        let statusLabel, statusIcon, statusColor;

        if (cd.isParasitePregnancy) {
            statusLabel = 'Parasite Emergence';
            statusIcon = '🚨';
            statusColor = '#dc2626';
        } else if (cd.isMonsterPregnancy) {
            statusLabel = 'Monster Birth';
            statusIcon = '👹';
            statusColor = '#dc2626';
        } else {
            statusLabel = 'In Labor';
            statusIcon = '🚨';
            statusColor = '#ef4444';
        }

        bot.currentStatus = { label: statusLabel, icon: statusIcon, color: statusColor };
        saveBots();
        return;
    }


    if (cd.pregnant) {
        const weeks = getPregnancyWeek(bot) || 0;
        const fetusCount = (cd.fetuses || []).length;
        let statusLabel, statusIcon, statusColor;

        // Check for special conditions first (these override normal statuses)
        if (cd.isParasitePregnancy && getParasiteWeek(bot) > 12) {
            statusLabel = 'Critical Parasite State';
            statusIcon = '💀';
            statusColor = '#dc2626';
        } else if (cd.isMonsterPregnancy && getMonsterPregnancyWeek(bot) > 7) {
            statusLabel = 'Dangerous Monster State';
            statusIcon = '☠️';
            statusColor = '#dc2626';
        } else {
            // Normal pregnancy statuses by type
            if (cd.isParasitePregnancy) {
                // Parasite pregnancy statuses
                const days = getParasiteWeek(bot) || 0;
                if (days < 3) {
                    statusLabel = 'Parasite Implantation';
                    statusIcon = '👽';
                    statusColor = '#7c3aed';
                } else if (days < 6) {
                    statusLabel = 'Parasite Feeding';
                    statusIcon = '🦠';
                    statusColor = '#a855f7';
                } else if (days < 9) {
                    statusLabel = 'Parasite Growth';
                    statusIcon = '💥';
                    statusColor = '#f97316';
                } else if (days < 12) {
                    statusLabel = 'Parasite Maturation';
                    statusIcon = '⚠️';
                    statusColor = '#ef4444';
                } else {
                    statusLabel = 'Parasite Emergence';
                    statusIcon = '🚨';
                    statusColor = '#dc2626';
                }
            } else if (cd.isMonsterPregnancy) {
                // Monster pregnancy statuses
                const days = getMonsterPregnancyWeek(bot) || 0;
                if (days < 3) {
                    statusLabel = 'Early Monster Signs';
                    statusIcon = '👁️';
                    statusColor = '#6b7280';
                } else if (days < 6) {
                    statusLabel = 'Monster Development';
                    statusIcon = '🐾';
                    statusColor = '#f97316';
                } else {
                    statusLabel = 'Advanced Monster State';
                    statusIcon = '👹';
                    statusColor = '#dc2626';
                }
            } else {
                // Normal human pregnancy statuses
                if (weeks < 2) {
                    statusLabel = 'Fertilized';
                    statusIcon = '✨';
                    statusColor = '#a855f7';
                } else if (weeks < 4) {
                    statusLabel = 'Implanted';
                    statusIcon = '🌱';
                    statusColor = '#86efac';
                } else if (weeks < 12) {
                    statusLabel = '1st Trimester';
                    statusIcon = '🤰';
                    statusColor = '#f9a8d4';
                } else if (weeks < 27) {
                    statusLabel = '2nd Trimester';
                    statusIcon = '🤰';
                    statusColor = '#f9a8d4';
                } else if (weeks < 37) {
                    statusLabel = '3rd Trimester';
                    statusIcon = '🤰';
                    statusColor = '#f9a8d4';
                } else if (weeks >= 40 && !cd.laborStarted) {
                    statusLabel = 'Overdue';
                    statusIcon = '⏳';
                    statusColor = '#f97316';
                } else {
                    statusLabel = 'Full Term';
                    statusIcon = '🤰';
                    statusColor = '#f9a8d4';
                }
            }
        }

        bot.currentStatus = { label: statusLabel, icon: statusIcon, color: statusColor };
        saveBots();
        return;
    }

    
    const cycleDay = getCurrentCycleDay(bot);
    if (cycleDay <= PERIOD_LENGTH) {
        bot.currentStatus = STATUS_LIST.find(s => s.label === 'On Period') || { label: 'On Period', icon: '🩸', color: '#f87171' };
        saveBots();
    }
}

function renderReproHealth(bot) {
    const section = document.getElementById('repro-health-section');
    if (!section) return;

    const isFemale = (bot.gender || '').toLowerCase().includes('female') || (bot.gender || '').toLowerCase().includes('woman') || (bot.gender || '').toLowerCase() === 'f';
    if (!isFemale) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    if (!bot.cycleData) initCycleData(bot);
    
    if (bot.cycleData && bot.cycleData.pregnant && !bot.cycleData.fetuses) {
        bot.cycleData.fetusCount = bot.cycleData.fetusCount || 1;
        bot.cycleData.fetuses = Array.from({length: bot.cycleData.fetusCount},
            () => ({ gender: 'unknown', nickname: '' }));
        saveBots();
    }
    
    if (bot.cycleData && bot.cycleData.pregnant && bot.cycleData.fetuses && !bot.cycleData.isParasitePregnancy) {
        // Only inflate for explicit count keywords in bio/appearance - NOT in prompt (traits live there)
        const bgText = ((bot.bio || '') + ' ' + (bot.background || '') + ' ' + (bot.appearance || '')).toLowerCase();
        let expectedCount = bot.cycleData.fetuses.length;
        if (/quadruplet|quad\b/.test(bgText)) expectedCount = 4;
        else if (/triplet/.test(bgText)) expectedCount = 3;
        else if (/\btwin[s]?\b/.test(bgText)) expectedCount = Math.max(2, expectedCount);
        // NOTE: 'always multiples' and 'multiple' intentionally excluded - those only apply at conception time
        if (expectedCount > bot.cycleData.fetuses.length) {
            bot.cycleData.fetusCount = expectedCount;
            while (bot.cycleData.fetuses.length < expectedCount) {
                bot.cycleData.fetuses.push({ gender: 'unknown', nickname: '' });
            }
            saveBots();
        }
    }
    const cd = bot.cycleData;
    const virtualDay = getVirtualDay(bot);
    const cycleDay = getCurrentCycleDay(bot);
    const phase = getCyclePhase(cycleDay);
    const pregWeeks = getPregnancyWeek(bot);

    
    const logEl = document.getElementById('repro-event-log');
    if (logEl) {
        if (cd.eventLog && cd.eventLog.length > 0) {
            logEl.innerHTML = cd.eventLog.map(e =>
                `<div class="re-item"><span style="color:#0084ff;font-weight:bold">Day ${e.day + 1}</span> - ${e.text}</div>`
            ).join('');
        } else {
            logEl.innerHTML = '<div style="color:var(--text-sub);font-size:11px;font-style:italic">No significant events yet.</div>';
        }
    }

    
    if (cd.pregnant || cd.birthVirtualDay !== null) {
        // Show symptom section when pregnant or postpartum
        const sympSectionPreg = document.getElementById('solo-preg-symptom-section');
        if (sympSectionPreg) sympSectionPreg.style.display = 'block';
        
        const cyclePanel = document.getElementById('cycle-panel');
        const pregPanel = document.getElementById('pregnancy-panel');
        if (cyclePanel) cyclePanel.style.display = 'none';
        if (pregPanel) pregPanel.style.display = 'block';

        if (cd.isParasitePregnancy) checkParasiteAutoLabor(bot);

        // ── PARASITE PREGNANCY: fill badge + larva list, then return early ──
        if (cd.isParasitePregnancy && cd.pregnant) {
            if (pregPanel) renderParasiteBioPanel(bot, pregPanel);

            const stageInfo  = getParasiteStageLabel(bot);
            const parasiteDay = getParasiteWeek(bot);
            const larvaeCount = (cd.fetuses || []).length;

            // Update the main preg-week badge
            const numEl   = document.getElementById('preg-week-num');
            const lblEl   = document.getElementById('preg-week-label');
            const descEl  = document.getElementById('preg-week-desc');
            const statEl  = document.getElementById('preg-status-text');
            const noteEl  = document.getElementById('preg-baby-note');
            const cntBadge= document.getElementById('fetus-count-badge');
            if (numEl)    numEl.textContent   = parasiteDay;
            if (lblEl)    lblEl.textContent   = 'Day / 15 - ' + stageInfo.stage;
            if (descEl)   descEl.textContent  = stageInfo.desc;
            if (statEl)   statEl.textContent  = stageInfo.icon + ' PARASITE GESTATION active';
            if (noteEl)   noteEl.textContent  = decodeUnicode('\uD83D\uDC7D') + ' ' + larvaeCount + ' parasite larv' + (larvaeCount === 1 ? 'a' : 'ae') + ' gestating';
            if (cntBadge) cntBadge.textContent = decodeUnicode('\uD83D\uDC7D') + ' ' + larvaeCount + ' Larvae';

            // Replace fetus-info area with larva cards (no "Baby X" labels)
            const infoEl = document.getElementById('pw-fetus-info');
            if (infoEl) {
                infoEl.style.display = 'block';
                infoEl.innerHTML = (cd.fetuses || []).map((_, i) =>
                    `<div style="display:flex;align-items:center;gap:6px;padding:2px 0">
                        <span style="color:#e879f9;font-size:13px">${decodeUnicode('\uD83D\uDC7D')}</span>
                        <b style="color:#c084fc">Larva ${i + 1}</b>
                        <span style="font-size:10px;color:#a855f7">- gestating inside host</span>
                    </div>`
                ).join('');
            }

            // Render parasite-specific symptoms list
            const sympEl = document.getElementById('preg-symptoms-list');
            if (sympEl) {
                const symsList = (stageInfo.syms || []);
                sympEl.innerHTML = symsList.length
                    ? symsList.map(s => `<div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:4px"><span style="color:#e879f9;flex-shrink:0">${decodeUnicode('\uD83D\uDC7D')}</span><span style="font-size:11px;color:#d8b4fe">${s}</span></div>`).join('')
                    : `<div style="color:#c084fc;font-size:11px;font-style:italic">${stageInfo.desc}</div>`;
            }

            // Initialize and show delivery progress panel only (cleaner UI)
            if (cd.laborStarted) {
                // Initialize delivery progress if not already done
                if (!cd.deliveryInProgress && typeof initDeliveryProgress === 'function') {
                    initDeliveryProgress(bot);
                }
                
                // Render individual delivery progress UI
                if (typeof renderDeliveryProgress === 'function') {
                    renderDeliveryProgress(bot);
                }
            }

            return;
        }

        if (cd.birthVirtualDay !== null && !cd.pregnant) {
            const startDay = cd.postpartumStartDay !== null ? cd.postpartumStartDay : cd.birthVirtualDay;
            const postDays = virtualDay - startDay;
            const stillRecovering = postDays < POSTPARTUM_DAYS;
            const wasParasiteBirth = cd.children && cd.children.some(c => c.type === 'parasite');
            
            document.getElementById('preg-week-num').textContent = postDays;
            document.getElementById('preg-week-label').textContent = wasParasiteBirth ? `Day(s) Post-Emergence (${POSTPARTUM_DAYS}d recovery)` : `Day(s) Postpartum (${POSTPARTUM_DAYS}d recovery)`;
            document.getElementById('preg-week-desc').textContent = stillRecovering 
                ? (wasParasiteBirth ? 'Recovery from parasite emergence. Body healing from trauma.' : 'Rest and recovery. Baby needs you 24/7.') 
                : 'Recovery complete. Cycle resuming soon.';
            document.getElementById('preg-status-text').textContent = stillRecovering 
                ? (wasParasiteBirth ? '\uD83D\uDC7D Parasite emergence complete. Recovery period.' : '\uD83E\uDD31 Baby has been born! Postpartum period.') 
                : '\u2705 Postpartum recovery complete.';
            const babyNoteEl2 = document.getElementById('preg-baby-note');
            if (babyNoteEl2) babyNoteEl2.textContent = stillRecovering 
                ? (wasParasiteBirth ? '\uD83D\uDC7D Larvae have emerged. Focus on physical recovery.' : '\uD83D\uDC76 Your newborn needs feeding every 2-3 hours.') 
                : '';

            // CLEANUP: hide labor progress panel
            const lpanelPP = document.getElementById('solo-labor-progress');
            if (lpanelPP) lpanelPP.style.display = 'none';

            // CLEANUP: remove any leftover parasite panel
            if (pregPanel) { const pp2 = pregPanel.querySelector('#parasite-panel'); if (pp2) pp2.remove(); }

            // CLEANUP: reset fetus count badge to born babies
            const badgePP = document.getElementById('fetus-count-badge');
            const bornCountPP = cd.children ? cd.children.filter(c => c.type !== 'parasite').length : 0;
            if (badgePP) badgePP.textContent = bornCountPP > 0 ? '\uD83D\uDC76 ' + bornCountPP + ' Born' : '';
            const setWeekBtnPP = document.getElementById('set-week-btn');
            if (setWeekBtnPP) setWeekBtnPP.style.display = 'none';

            // CLEANUP: show postpartum symptoms instead of labor/parasite info
            const sympElPP = document.getElementById('preg-symptoms-list');
            if (sympElPP) {
                const ppSymps = wasParasiteBirth
                    ? (postDays <= 2
                        ? ['Severe abdominal cramping from emergence trauma', 'Internal bleeding stopping slowly', 'Nausea and dizziness from blood loss', 'Extreme fatigue - body in shock', 'Emotional numbness and dissociation']
                        : postDays <= 5
                        ? ['Gradual pain reduction but still sore', 'Weakness from blood loss recovery', 'Appetite slowly returning', 'Difficulty sleeping - flashbacks', 'Mood swings between numbness and anger']
                        : ['Energy beginning to return', 'Physical healing progressing', 'Appetite mostly normal', 'Sleep patterns stabilizing', 'Emotional processing beginning'])
                    : (postDays <= 2
                        ? ['Uterine cramping as womb contracts back', 'Heavy lochia (postpartum bleeding)', 'Perineal soreness / discomfort', 'Breast engorgement as milk comes in', 'Night sweats, bone-deep fatigue, emotional swings']
                        : postDays <= 5
                        ? ['Lochia lightening to pinkish-brown', 'Breast fullness \u2014 feeding frequently', 'Lower back ache, pelvic soreness', 'Fatigue \u2014 sleep when baby sleeps', 'Mood fluctuations (baby blues possible)']
                        : ['Gradual energy returning', 'Continued light lochia', 'Breastfeeding establishing a rhythm', 'Gentle movement only \u2014 no strenuous activity']);
                sympElPP.innerHTML = ppSymps.map(s => '<div style="color:var(--text-main);font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">\u2022 ' + s + '</div>').join('');
            }

            const pwFetusInfo = document.getElementById('pw-fetus-info');
            if (pwFetusInfo) pwFetusInfo.style.display = 'none';
            return;
        }

        if (cd.laborStarted && cd.pregnant) {
            // CLEANUP: remove any stale parasite panel during normal labor
            if (pregPanel && !cd.isParasitePregnancy) { const ppL = pregPanel.querySelector('#parasite-panel'); if (ppL) ppL.remove(); }
            
            const weeks = getPregnancyWeek(bot) || 0;
            document.getElementById('preg-week-num').textContent = weeks;
            document.getElementById('preg-week-label').textContent = 'Week - IN LABOR';

            const laborMinutes = getLaborElapsedMinutes(bot);
            const laborHours = laborMinutes / 60;
            const laborStageForDisplay = (cd.laborProgress && cd.laborProgress.stage) || (laborHours < 1 ? (cd.waterBroke ? 'early' : 'prelabor') : laborHours < 2 ? 'early' : laborHours < 8 ? 'active' : laborHours < 14 ? 'transition' : 'pushing');
            document.getElementById('preg-week-desc').textContent =
                laborStageForDisplay === 'prelabor' ? 'Irregular cramps - is this really labor?' :
                laborStageForDisplay === 'early' ? (cd.waterBroke ? 'Waters broke - early labor confirmed.' : 'Early labor - cramping, irregular contractions.') :
                laborStageForDisplay === 'active' ? 'Active labor - contractions intensifying!' :
                laborStageForDisplay === 'transition' ? 'Transition - peak intensity, almost pushing!' :
                'Pushing stage - delivery imminent!';
            document.getElementById('preg-status-text').textContent = '\uD83D\uDEA8 IN LABOR - Delivery imminent!';
            const _babyNoteL = document.getElementById('preg-baby-note');
            if (_babyNoteL) _babyNoteL.textContent = laborHours > 8 ? '\uD83E\uDD7A Hospital strongly recommended.' : '\uD83D\uDCA8 Breathing through contractions.';
            
            renderFetusesInBio(bot);
            
            _renderLaborProgressPanel(bot, 'solo-labor-progress', 'solo-labor-progress-content');
            
            const soloSympEl = document.getElementById('preg-symptoms-list');
            if (soloSympEl) soloSympEl.innerHTML = renderLaborSymptomsHTML(cd, laborHours);
            return;
        }

        const isMonsterPreg = !!(cd.isMonsterPregnancy);
        const weeks = pregWeeks || 0;
        
        const setWeekBtn = document.getElementById('set-week-btn');
        if (setWeekBtn) setWeekBtn.textContent = isMonsterPreg ? '\u270F\uFE0F Set Day' : '\u270F\uFE0F Set Week';
        const info = getPregnancyInfo(weeks);
        if (info) {
            if (isMonsterPreg) {
                
                const rawDaysPregnant = Math.max(0, getVirtualDay(bot) - (cd.conceptionVirtualDay || 0));
                document.getElementById('preg-week-num').textContent = rawDaysPregnant;
                const monsterWeeks = getMonsterPregnancyWeek(bot) || 0;
                const monsterTrimLabel = monsterWeeks <= 13 ? '1st Trimester' : monsterWeeks <= 26 ? '2nd Trimester' : '3rd Trimester';
                document.getElementById('preg-week-label').textContent = 'Day - ' + monsterTrimLabel;
            } else {
                
                const rawDaysPregnant = getVirtualDay(bot) - (bot.cycleData.conceptionVirtualDay || 0);
                const effectiveDays = rawDaysPregnant * PREGNANCY_SPEED; 
                if (weeks < 1) {
                    document.getElementById('preg-week-num').textContent = Math.max(0, Math.floor(effectiveDays));
                    document.getElementById('preg-week-label').textContent = 'Day(s) - ' + info.label;
                } else {
                    document.getElementById('preg-week-num').textContent = weeks;
                    const _isOverdueLabel = weeks >= 40 && !cd.laborStarted;
                    document.getElementById('preg-week-label').textContent = _isOverdueLabel
                        ? (weeks >= 45 ? 'Week - \u23F3 Critically Overdue' : weeks >= 43 ? 'Week - \u23F3 Very Overdue' : 'Week - \u23F3 Overdue')
                        : info.label + (info.trimester ? ' - ' + info.trimester + ' Trimester' : '');
                }
            }
            document.getElementById('preg-week-desc').textContent = info.desc;
            
            const pregAwarenessWeek = weeks;
            const testTakenUI = bot.cycleData && bot.cycleData.pregnancyTestTaken;
            const pregStatusDisplay = testTakenUI ? info.status :
                pregAwarenessWeek < 3 ? '\uD83D\uDD2C Too early - she feels normal' :
                pregAwarenessWeek < 5 ? '\uD83D\uDE36 No signs yet' :
                pregAwarenessWeek < 8 ? '\uD83E\uDD14 Period late - she wonders...' :
                '\uD83D\uDE9F Strongly suspects - no test yet';
            document.getElementById('preg-status-text').textContent = pregStatusDisplay;
            
            const fCount = (bot.cycleData.fetuses || []).length;
            const multLabel = fCount === 1 ? '' : fCount === 2 ? '\uD83D\uDC6F Twins - ' : fCount === 3 ? '\uD83D\uDC6F\u200D\u2640\uFE0F Triplets - ' : `${fCount} Multiples - `;
            const _babyNoteP = document.getElementById('preg-baby-note');
            if (_babyNoteP) _babyNoteP.textContent = testTakenUI
                ? multLabel + info.baby
                : '\uD83E\uDDEA Pregnancy test not yet taken';
            const sympEl = document.getElementById('preg-symptoms-list');
            if (sympEl && info.symptoms) {
                const testBanner = !testTakenUI && weeks >= 5
                    ? `<div style="color:#f59e0b;border:1px solid #f59e0b33;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-size:11px">\uD83E\uDDEA <b>Test not taken</b> - she won't know for certain until she tests</div>`
                    : testTakenUI
                    ? `<div style="color:#4ade80;font-size:11px;padding:3px 0;margin-bottom:4px">\u2705 Pregnancy test taken (Day ${bot.cycleData.pregnancyTestDay + 1})</div>`
                    : '';

                // Awareness level - gates what symptoms can be shown in the UI
                const _uiAwareness = testTakenUI ? 'confirmed'
                    : weeks < 3 ? 'unaware'
                    : weeks < 5 ? 'vague'
                    : weeks < 8 ? 'suspects'
                    : 'strongly_suspects';

                const isHyperPregUI = fCount >= 4;

                let multiNote = '';
                // Only show the hyper panel when she's aware enough to experience symptoms
                if (isHyperPregUI && _uiAwareness !== 'unaware') {
                    const hpLabel = fCount === 4 ? 'Quadruplets' : fCount === 5 ? 'Quintuplets' : fCount === 6 ? 'Sextuplets' : fCount === 7 ? 'Septuplets' : fCount === 8 ? 'Octuplets' : `${fCount} Multiples`;
                    let trimLabel, trimSymptoms, trimNote;
                    if (weeks <= 13) {
                        trimLabel = 'T1 - Weeks 1–13';
                        trimSymptoms = ['Intense nausea - morning, noon, and night, no schedule', 'Bone-deep exhaustion - sleep barely helps', 'Breasts sore and full, sensitive to any contact', 'Frequent urination - much more than before', 'Headaches coming and going', 'Mild bloating - lower belly already feeling tighter', 'Food aversions and cravings - inconsistent and strong'];
                        trimNote = 'Not visibly pregnant yet - but feels it constantly.';
                    } else if (weeks <= 26) {
                        trimLabel = 'T2 - Weeks 14–26';
                        trimSymptoms = ['Belly visibly large - cannot hide it, precedes her into rooms', 'Multiple babies kicking simultaneously - strong, distinct movements', 'Round ligament pain - sharp tugs when standing or turning', 'Constant lower backache, worse in lumbar spine', 'Regular Braxton Hicks - belly hardens and releases', 'Heartburn after most meals', 'Shortness of breath on exertion', 'Tires faster than expected'];
                        trimNote = 'Position adjustments frequent. Hand to belly when kicked hard. Braces before standing.';
                    } else {
                        trimLabel = 'T3 - Weeks 27+';
                        trimSymptoms = ['Lungs at ~65% capacity - every breath slightly shallow', 'Back pain chronic - only registers when it spikes sharp', 'Constant powerful multi-directional fetal movement', 'Getting up requires effort and planning', 'Braxton Hicks throughout the day - tides, not panic', 'Constant pelvic pressure - every step deliberate', 'Ankles/feet swelling by evening', 'Bone-level permanent fatigue'];
                        trimNote = 'This is her entire physical reality. She has adapted. She continues.';
                    }
                    multiNote = `<div style="background:linear-gradient(135deg,#1a0028,#3d0060);border:1px solid #c084fc;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:11px">
                      <div style="color:#e879f9;font-weight:bold;font-size:12px;margin-bottom:2px">\u26A0\uFE0F HYPERPREGNANCY - ${hpLabel}</div>
                      <div style="color:#a78bfa;font-size:10px;font-weight:bold;margin-bottom:6px;letter-spacing:0.3px">${trimLabel}</div>
                      ${trimSymptoms.map(s => `<div style="color:#f0abfc;font-size:10px;margin-bottom:2px">• ${s}</div>`).join('')}
                      <div style="color:#c084fc;font-size:10px;margin-top:6px;font-style:italic;border-top:1px solid #7c3aed44;padding-top:5px">\uD83D\uDCAC ${trimNote}</div>
                    </div>`;
                } else if (!isHyperPregUI && fCount > 1) {
                    multiNote = `<div style="color:#c084fc;border:1px solid #c084fc33;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-size:11px">\uD83D\uDC6F <b>${fCount === 2 ? 'Twins' : fCount === 3 ? 'Triplets' : fCount + ' Multiples'}</b> - symptoms typically MORE intense: stronger nausea, larger bump, higher hCG</div>`;
                }

                // sympList: empty for hyperpreg (panel already shows everything), normal info.symptoms otherwise
                // Also gate by awareness: unaware = no symptoms at all
                const sympList = (_uiAwareness === 'unaware')
                    ? []
                    : isHyperPregUI
                    ? [] // panel already contains the full trimester list - no duplication
                    : (info.symptoms || []).slice(0, 10);

                sympEl.innerHTML = testBanner + multiNote
                    + sympList.map(s => `<div style="color:var(--text-main);font-size:11px;padding:4px 0;border-bottom:1px solid var(--border)">• ${s}</div>`).join('')
                    + (info.cannotFeel && info.cannotFeel.length > 0 ? '<div style="margin-top:4px">'+info.cannotFeel.map(s => `<div style="color:#f87171;font-size:11px;padding:4px 0">\u26D4 ${s}</div>`).join('')+'</div>' : '');
            }
            
            renderFetusesInBio(bot);
            
            const soloLaborPanel = document.getElementById('solo-labor-progress');
            if (soloLaborPanel) soloLaborPanel.style.display = 'none';
        }
        
        renderBodyMeasurements(bot);
        return;
    }

    
    renderBodyMeasurements(bot);

    
    const cyclePanel = document.getElementById('cycle-panel');
    const pregPanel = document.getElementById('pregnancy-panel');
    if (cyclePanel) cyclePanel.style.display = 'block';
    if (pregPanel) pregPanel.style.display = 'none';

    // Hide symptom section when not pregnant
    const sympSection = document.querySelector('.preg-symptom-section');
    if (sympSection) sympSection.style.display = 'none';

    
    const daysUntilPeriod = cd.cycleLength - cycleDay + 1;

    const el = (id) => document.getElementById(id);
    el('rp-day-in-cycle').textContent = cycleDay;
    el('rp-fertility').textContent = phase.fertility;
    el('rp-next-period').textContent = daysUntilPeriod <= 0 ? 'Now' : daysUntilPeriod + 'd';
    el('rp-phase-name').textContent = phase.name + ' - ' + phase.desc;
    const fillEl = el('rp-phase-fill');
    fillEl.style.width = phase.fertilityScore + '%';
    fillEl.style.background = phase.color;
}
