// delivery_ui.js - UI for individual delivery progress
// Depends on: delivery_progress.js, repro/render.js

/**
 * Render delivery progress UI in the pregnancy panel
 * @param {Object} bot - The pregnant bot
 */
function renderDeliveryProgress(bot) {
    if (!bot || !bot.cycleData) return;
    
    const cd = bot.cycleData;
    const status = getDeliveryStatus(bot);
    if (!status || !status.inProgress) return;
    
    // Find or create delivery progress container
    let container = document.getElementById('delivery-progress-container');
    if (!container) {
        container = createDeliveryContainer();
    }
    
    // Update header
    const header = container.querySelector('.delivery-header');
    if (header) {
        const isParasite = cd.isParasitePregnancy;
        const delivered = status.totalDelivered;
        const total = status.totalFetuses;
        const simultaneous = status.simultaneousActive;
        const activeCount = status.activeIndices?.length || 1;
        
        let headerText = `
            <span style="font-size:14px;font-weight:bold;color:#e879f9">
                ${decodeUnicode(isParasite ? '\\uD83D\\uDC7D' : '\\uD83D\\uDC76')} 
                Delivery in Progress: ${delivered}/${total} ${isParasite ? 'Larvae' : 'Babies'}
            </span>
            <span style="font-size:11px;color:#a855f7">
                ${isParasite ? 'EMERGENCE' : 'LABOR'} ACTIVE
            </span>
        `;
        
        // Add simultaneous warning for parasites
        if (isParasite && simultaneous && activeCount > 1) {
            headerText = `
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:14px;font-weight:bold;color:#ef4444;">
                        ${decodeUnicode('\\u26a0\\ufe0f')} SIMULTANEOUS EMERGENCE!
                    </span>
                    <span style="font-size:10px;padding:2px 6px;background:#ef444433;color:#ef4444;border-radius:4px;border:1px solid #ef4444;">
                        ${activeCount} AT ONCE
                    </span>
                </div>
                <span style="font-size:11px;color:#f87171;font-style:italic;">
                    The parasites are fighting to emerge together!
                </span>
            `;
        }
        
        header.innerHTML = headerText;
    }
    
    // Render only actively emerging fetuses (not all gestating ones)
    const list = container.querySelector('.delivery-list');
    if (list) {
        // Filter to only show active emerging fetuses (emerging stage only)
        const activeIndices = status.activeIndices || [status.currentIndex].filter(i => i >= 0);
        const activeFetuses = activeIndices.map(i => ({
            fetus: status.fetuses[i],
            index: i
        })).filter(({fetus}) => fetus && fetus.stage === 'emerging'); // Only show actively emerging
        
        // If no active emerging fetuses, hide the container
        if (activeFetuses.length === 0) {
            container.style.display = 'none';
        } else {
            // Only render the active ones
            list.innerHTML = activeFetuses.map(({fetus, index}) => 
                renderFetusProgressCard(fetus, index, cd.isParasitePregnancy)
            ).join('');
        }
    }
    
    // Update push button state
    const pushBtn = container.querySelector('.push-button');
    if (pushBtn) {
        const currentFetus = status.fetuses[status.currentIndex];
        const canPush = currentFetus && currentFetus.stage !== 'delivered';
        pushBtn.disabled = !canPush;
        pushBtn.style.opacity = canPush ? '1' : '0.5';
    }
    
    // Toggle hint text based on simultaneous emergence
    const hintNormal = container.querySelector('.delivery-hint-normal');
    const hintSimultaneous = container.querySelector('.delivery-hint-simultaneous');
    if (hintNormal && hintSimultaneous) {
        if (status.simultaneousActive && status.activeIndices.length > 1) {
            hintNormal.style.display = 'none';
            hintSimultaneous.style.display = 'inline';
        } else {
            hintNormal.style.display = 'inline';
            hintSimultaneous.style.display = 'none';
        }
    }
    
    container.style.display = 'block';
}

/**
 * Create the delivery progress container element
 * Works for both solo chat and group chat
 */
function createDeliveryContainer() {
    // Find the pregnancy panel to append delivery UI to the end
    const pregPanel = document.getElementById('preg-panel') || 
                      document.getElementById('gp-preg-panel') ||
                      document.getElementById('solo-preg-panel');
    
    if (!pregPanel) return null;
    
    const container = document.createElement('div');
    container.id = 'delivery-progress-container';
    container.className = 'delivery-progress-container';
    container.style.cssText = `
        margin-top: 12px;
        padding: 12px;
        background: linear-gradient(135deg, #1a0b2e 0%, #0f0518 100%);
        border: 1px solid #7c3aed;
        border-radius: 8px;
        display: none;
        position: relative;
        z-index: 1;
        clear: both;
    `;
    
    container.innerHTML = `
        <div class="delivery-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #7c3aed44;"></div>
        <div class="delivery-list" style="display:flex;flex-direction:column;gap:8px;"></div>
        <div class="delivery-controls" style="margin-top:12px;display:flex;gap:8px;">
            <button class="push-button" onclick="handlePushClick()" style="
                flex: 1;
                padding: 10px 16px;
                background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            ">
                ${decodeUnicode('\uD83D\uDCAA')} PUSH NOW
            </button>
        </div>
        <div class="delivery-hint" style="margin-top:8px;font-size:10px;color:#a855f7;text-align:center;font-style:italic;">
            <span class="delivery-hint-normal">Click PUSH to help with delivery. Each push advances the current ${decodeUnicode('\uD83D\uDC7D')}'s emergence.</span>
            <span class="delivery-hint-simultaneous" style="display:none;color:#f87171;font-weight:bold;">
                ${decodeUnicode('\u26a0\ufe0f')} TWO parasites are pushing out TOGETHER! Each push helps BOTH emerge!
            </span>
        </div>
    `;
    
    // Append to the END of the pregnancy panel (not inline)
    pregPanel.appendChild(container);
    return container;
}

/**
 * Render a single fetus/larva progress card
 */
function renderFetusProgressCard(fetus, index, isParasite) {
    const isDelivered = fetus.stage === 'delivered';
    const isCurrent = fetus.isCurrent;
    const isEmerging = fetus.stage === 'emerging';
    
    // Progress bar color
    let progressColor = '#22c55e'; // Green
    if (isParasite) progressColor = '#e879f9'; // Pink for parasites
    if (isEmerging) progressColor = '#f59e0b'; // Orange for emerging
    
    // Status icon
    let statusIcon = decodeUnicode('\uD83D\uDC7D'); // Larva default
    if (isDelivered) statusIcon = decodeUnicode('\u2705'); // Checkmark
    else if (isEmerging) statusIcon = decodeUnicode('\uD83D\uDEA8'); // Warning
    else if (!isParasite) statusIcon = decodeUnicode('\uD83D\uDC76'); // Baby
    
    // Status text
    let statusText = 'Waiting';
    if (isDelivered) statusText = `DELIVERED #${fetus.emergenceOrder}`;
    else if (isEmerging) statusText = `EMERGING - ${Math.round(fetus.progress)}%`;
    else if (isCurrent) statusText = 'ACTIVE - Ready to push';
    
    // Progress bar
    const progressBar = `
        <div style="width:100%;height:6px;background:#1a0b2e;border-radius:3px;overflow:hidden;margin-top:6px;">
            <div style="
                width: ${fetus.progress}%;
                height: 100%;
                background: ${progressColor};
                transition: width 0.3s ease;
                box-shadow: 0 0 8px ${progressColor}66;
            "></div>
        </div>
    `;
    
    // Push counter (only show for current/emerging)
    let pushInfo = '';
    if (!isDelivered && (isCurrent || isEmerging)) {
        pushInfo = `
            <div style="font-size:10px;color:#a855f7;margin-top:4px;">
                Pushes: ${fetus.pushes}/${fetus.requiredPushes} 
                ${fetus.pushes >= fetus.requiredPushes * 0.8 ? '(Almost there!)' : ''}
            </div>
        `;
    }
    
    // Card styling based on state
    let borderColor = '#4c1d95';
    let bgOpacity = '0.3';
    if (isDelivered) {
        borderColor = '#22c55e';
        bgOpacity = '0.15';
    } else if (isEmerging) {
        borderColor = '#f59e0b';
        bgOpacity = '0.4';
    } else if (isCurrent) {
        borderColor = '#e879f9';
        bgOpacity = '0.35';
    }
    
    return `
        <div style="
            padding: 8px 10px;
            background: rgba(124, 58, 237, ${bgOpacity});
            border: 1px solid ${borderColor};
            border-radius: 6px;
            opacity: ${isDelivered ? 0.7 : 1};
        ">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;flex:1;">
                    <span style="font-size:16px;">${statusIcon}</span>
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span style="font-size:12px;font-weight:bold;color:${isDelivered ? '#22c55e' : '#e879f9'};">
                                ${isParasite ? 'Larva' : 'Baby'} ${index + 1}
                            </span>
                            ${isEmerging && !isDelivered ? '<span style="font-size:9px;padding:1px 4px;background:#e879f933;color:#e879f9;border-radius:3px;">ACTIVE</span>' : ''}
                            ${(isEmerging && fetus.simultaneousWith !== null && fetus.simultaneousWith !== undefined) ? '<span style="font-size:9px;padding:1px 4px;background:#ef444433;color:#ef4444;border-radius:3px;border:1px solid #ef4444;">⚡ SIMULTANEOUS</span>' : ''}
                        </div>
                        <div style="font-size:10px;color:${isDelivered ? '#22c55e' : '#a855f7'};">
                            ${statusText}
                        </div>
                        ${pushInfo}
                    </div>
                </div>
                ${isDelivered ? 
                    `<span style="font-size:11px;color:#22c55e;font-weight:bold;">#${fetus.emergenceOrder}</span>` :
                    `<span style="font-size:11px;color:${isEmerging ? '#f59e0b' : '#a855f7'};font-weight:bold;">${Math.round(fetus.progress)}%</span>`
                }
            </div>
            ${progressBar}
        </div>
    `;
}

/**
 * Handle push button click
 */
function handlePushClick() {
    // Get current bot from global or active context
    const bot = getCurrentBotForDelivery();
    if (!bot) {
        showToast('No active labor detected', '#1a0b2e', '#a855f7');
        return;
    }
    
    const result = doPushAction(bot);
    
    if (result?.error) {
        showToast(result.error, '#1a0b2e', '#ef4444');
        return;
    }
    
    // Visual feedback
    if (result?.delivered) {
        // Simultaneous delivery message
        if (result.simultaneous) {
            showToast(
                `${decodeUnicode('\uD83D\uDEA8')} ${result.deliveredCount} PARASITES EMERGED SIMULTANEOUSLY!`,
                '#1a0a0a',
                '#ef4444'
            );
        } else {
            showToast(
                `${decodeUnicode('\uD83C\uDF89')} ${result.isComplete ? 'All deliveries complete!' : 'Delivery successful!'}`,
                '#0a1a0a',
                '#22c55e'
            );
        }
        
        // Add birth message(s) to chat if in group mode
        if (curGroupId) {
            const grp = groups.find(g => g.id === curGroupId);
            if (grp) {
                if (result.simultaneous && result.results) {
                    // Multiple simultaneous deliveries
                    const desc = result.results.map(r => r.description).join(' ');
                    grp.history.push({
                        role: 'system',
                        content: `[BIRTH EVENT] ⚡ SIMULTANEOUS EMERGENCE! ${desc} The parasites burst forth together in a writhing mass!`,
                        msgId: Date.now().toString(),
                        isEvent: true
                    });
                } else if (result.description) {
                    grp.history.push({
                        role: 'system',
                        content: `[BIRTH EVENT] ${result.description}`,
                        msgId: Date.now().toString(),
                        isEvent: true
                    });
                }
                renderGroupChat();
            }
        }
    } else {
        // Show push feedback - special message for simultaneous
        let msg;
        if (result?.simultaneousActive) {
            const simultaneousFeedback = [
                'Both parasites pushing! Push harder!',
                'Two are fighting to emerge! Keep pushing!',
                'Simultaneous emergence! Push for both!',
                'They\'re coming together! Don\'t stop!',
                'Double emergence in progress! Push!'
            ];
            msg = simultaneousFeedback[Math.floor(Math.random() * simultaneousFeedback.length)];
        } else {
            const pushFeedback = ['Push!', 'Keep pushing!', 'Almost there!', 'You can do it!', 'Push harder!'];
            msg = pushFeedback[Math.floor(Math.random() * pushFeedback.length)];
        }
        
        // Show average progress of all active
        let avgProgress = result?.progress || 0;
        if (result?.results && result.results.length > 1) {
            avgProgress = result.results.reduce((sum, r) => sum + r.progress, 0) / result.results.length;
        }
        
        const progressText = result?.simultaneousActive ? `(${Math.round(avgProgress)}% both)` : `(${Math.round(avgProgress)}%)`;
        showToast(`${decodeUnicode('\uD83D\uDCAA')} ${msg} ${progressText}`, '#1a0b2e', result?.simultaneousActive ? '#ef4444' : '#e879f9');
    }
    
    // Re-render
    renderDeliveryProgress(bot);
}

/**
 * Get the currently relevant bot for delivery
 * Uses active chat context
 */
function getCurrentBotForDelivery() {
    // Try group chat first
    if (typeof curGroupId !== 'undefined' && curGroupId) {
        const grp = groups?.find(g => g.id === curGroupId);
        if (grp) {
            // Find first bot in labor
            const botInLabor = grp.memberIds
                ?.map(id => bots?.find(b => b.id === id))
                ?.find(b => b?.cycleData?.deliveryInProgress);
            if (botInLabor) return botInLabor;
        }
    }
    
    // Try solo chat
    if (typeof curBotId !== 'undefined' && curBotId) {
        const bot = bots?.find(b => b.id === curBotId);
        if (bot?.cycleData?.deliveryInProgress) return bot;
    }
    
    // Fallback - search all bots
    return bots?.find(b => b?.cycleData?.deliveryInProgress);
}

/**
 * Auto-update delivery progress (called periodically)
 */
function autoUpdateDeliveryProgress() {
    // Find all bots in active delivery
    const botsInLabor = bots?.filter(b => b?.cycleData?.deliveryInProgress) || [];
    
    botsInLabor.forEach(bot => {
        const result = advanceDeliveryProgress(bot, 'passive');
        
        // Update UI if this bot is currently being viewed
        const isVisible = (
            (curBotId === bot.id) || 
            (curGroupId && groups?.find(g => g.id === curGroupId)?.memberIds?.includes(bot.id))
        );
        
        if (isVisible) {
            renderDeliveryProgress(bot);
        }
        
        // Check for completed deliveries
        if (result?.delivered && result.isComplete) {
            showToast(
                `${decodeUnicode('\uD83C\uDF89')} All deliveries complete for ${bot.name}!`,
                '#0a1a0a',
                '#22c55e'
            );
        }
    });
}

/**
 * Show/hide delivery UI based on labor state
 */
function updateDeliveryUIVisibility(bot) {
    const container = document.getElementById('delivery-progress-container');
    if (!container) return;
    
    const showDelivery = bot?.cycleData?.deliveryInProgress && bot?.cycleData?.laborStarted;
    container.style.display = showDelivery ? 'block' : 'none';
    
    if (showDelivery) {
        renderDeliveryProgress(bot);
    }
}

// Export functions
window.renderDeliveryProgress = renderDeliveryProgress;
window.handlePushClick = handlePushClick;
window.autoUpdateDeliveryProgress = autoUpdateDeliveryProgress;
window.updateDeliveryUIVisibility = updateDeliveryUIVisibility;

// NOTE: Delivery progress is now TURN-BASED only
// Progress happens when:
// 1. User sends message (triggers time advancement)
// 2. User clicks Continue (triggers time advancement)
// 3. User clicks PUSH button (immediate progress)
// No automatic background progression - user must interact
