// delivery_progress.js - Individual larva/baby delivery progress tracking
// Depends on: repro/cycle.js, repro/render.js

/**
 * Initialize delivery progress tracking for each fetus when labor starts
 * Called when labor begins (parasite or normal pregnancy)
 * @param {Object} bot - The pregnant bot
 */
function initDeliveryProgress(bot) {
    if (!bot || !bot.cycleData || !bot.cycleData.pregnant) return;
    
    const cd = bot.cycleData;
    const fetuses = cd.fetuses || [];
    
    // Initialize progress data for each fetus
    fetuses.forEach((fetus, index) => {
        fetus.deliveryProgress = 0;        // 0-100% progress
        fetus.deliveryStage = 'gestating';   // 'gestating', 'emerging', 'delivered'
        fetus.emergenceOrder = null;         // Which number in sequence (1, 2, 3...)
        fetus.laborStartTime = Date.now();   // When labor started for this fetus
        fetus.pushEffortRequired = calculatePushEffort(bot, index); // Pushes needed
        fetus.currentPushes = 0;             // Pushes completed
        fetus.deliveryTime = null;           // Timestamp when delivered
        fetus.simultaneousWith = null;       // Index of fetus emerging simultaneously
    });
    
    cd.deliveryInProgress = true;
    cd.currentEmergingIndex = 0;  // Which fetus is currently emerging (primary)
    cd.activeEmergingIndices = [0]; // Array of all currently emerging fetuses (supports simultaneous)
    cd.totalDelivered = 0;          // Count of delivered fetuses
    cd.simultaneousEmergenceActive = false; // Whether multiple are emerging at once
    
    saveBots();
    console.log(`[Delivery Progress] Initialized ${fetuses.length} fetuses for delivery`);
}

/**
 * Calculate how much push effort is required for each fetus
 * Later fetuses in multiples require less effort (body is primed)
 * @param {Object} bot - The pregnant bot
 * @param {number} index - Fetus index (0-based)
 * @returns {number} Required number of effective pushes
 */
function calculatePushEffort(bot, index) {
    const cd = bot.cycleData;
    const isParasite = cd.isParasitePregnancy;
    const totalFetuses = (cd.fetuses || []).length;
    
    // Base pushes needed
    let basePushes = isParasite ? 8 : 12; // Parasites emerge faster
    
    // Multiples: each subsequent baby is faster (body is primed)
    const reduction = index * 2; // Each next one needs 2 fewer pushes
    basePushes = Math.max(3, basePushes - reduction); // Minimum 3 pushes
    
    // Random variation (±2)
    const variation = Math.floor(Math.random() * 5) - 2;
    
    return Math.max(2, basePushes + variation);
}

/**
 * Advance delivery progress for the currently emerging fetus(es)
 * Called periodically during labor or when user "pushes"
 * Supports simultaneous emergence for parasites (50% chance for 2nd to join)
 * @param {Object} bot - The pregnant bot
 * @param {string} action - 'passive' (time-based) or 'push' (user action)
 * @returns {Object} Status of current delivery
 */
function advanceDeliveryProgress(bot, action = 'passive') {
    if (!bot || !bot.cycleData || !bot.cycleData.deliveryInProgress) return null;
    
    const cd = bot.cycleData;
    const fetuses = cd.fetuses || [];
    const isParasite = cd.isParasitePregnancy;
    
    // All delivered?
    if (cd.totalDelivered >= fetuses.length) {
        return completeDelivery(bot);
    }
    
    // Ensure activeEmergingIndices exists
    if (!cd.activeEmergingIndices || cd.activeEmergingIndices.length === 0) {
        cd.activeEmergingIndices = [cd.currentEmergingIndex || 0];
    }
    
    // Check for simultaneous emergence opportunity (parasites only)
    checkForSimultaneousEmergence(bot);
    
    // Process all currently emerging fetuses
    const results = [];
    let anyDelivered = false;
    let deliveredIndices = [];
    
    cd.activeEmergingIndices.forEach(idx => {
        const fetus = fetuses[idx];
        if (!fetus || fetus.deliveryStage === 'delivered') return;
        
        // Calculate progress increment
        let progressIncrement = 0;
        
        if (action === 'push') {
            // User actively pushing - significant progress
            progressIncrement = 15 + Math.random() * 10; // 15-25% per push
            fetus.currentPushes++;
        } else {
            // Passive time-based progress (much slower)
            const laborMinutes = (Date.now() - (fetus.laborStartTime || Date.now())) / 60000;
            
            // Progress slows as labor continues (exhaustion)
            const exhaustionFactor = Math.max(0.5, 1 - (laborMinutes / 180)); // Min 50% efficiency, slower exhaustion
            progressIncrement = (5 + Math.random() * 5) * exhaustionFactor; // 5-10% per tick when fresh
            
            // Parasites progress faster when multiple are emerging (chaos factor)
            if (isParasite && cd.simultaneousEmergenceActive) {
                progressIncrement *= 1.3; // 30% faster when simultaneous
            }
        }
        
        // Apply progress
        fetus.deliveryProgress = Math.min(100, 
            (fetus.deliveryProgress || 0) + progressIncrement);
        
        // Update stage based on progress
        if (fetus.deliveryProgress < 30) {
            fetus.deliveryStage = 'gestating';
        } else if (fetus.deliveryProgress < 100) {
            fetus.deliveryStage = 'emerging';
        }
        
        // Check for delivery
        if (fetus.currentPushes >= fetus.pushEffortRequired || fetus.deliveryProgress >= 100) {
            deliveredIndices.push(idx);
            anyDelivered = true;
        }
        
        results.push({
            fetusIndex: idx,
            progress: fetus.deliveryProgress,
            stage: fetus.deliveryStage,
            pushes: fetus.currentPushes,
            requiredPushes: fetus.pushEffortRequired
        });
    });
    
    // Deliver all ready fetuses
    if (anyDelivered) {
        const deliveryResults = deliveredIndices.map(idx => deliverFetus(bot, idx));
        const simultaneous = deliveredIndices.length > 1;
        
        return {
            delivered: true,
            simultaneous: simultaneous,
            deliveredCount: deliveredIndices.length,
            results: deliveryResults,
            isComplete: cd.totalDelivered >= fetuses.length
        };
    }
    
    return {
        delivered: false,
        activeCount: cd.activeEmergingIndices.length,
        simultaneousActive: cd.simultaneousEmergenceActive,
        results: results
    };
}

/**
 * Check if a second parasite should start emerging simultaneously
 * 50% chance for parasites when primary reaches 40%+ progress
 * @param {Object} bot - The pregnant bot
 */
function checkForSimultaneousEmergence(bot) {
    const cd = bot.cycleData;
    if (!cd.isParasitePregnancy || !cd.activeEmergingIndices) return;
    
    // Only add simultaneous if there's only one emerging so far
    if (cd.activeEmergingIndices.length !== 1) return;
    
    const primaryIdx = cd.activeEmergingIndices[0];
    const primaryFetus = cd.fetuses?.[primaryIdx];
    
    // Primary must be at least 40% emerged to trigger simultaneous
    if (!primaryFetus || primaryFetus.deliveryProgress < 40) return;
    
    // 50% chance to trigger simultaneous emergence
    if (Math.random() >= 0.5) return;
    
    // Find next undelivered fetus
    const fetuses = cd.fetuses || [];
    let nextIdx = null;
    for (let i = primaryIdx + 1; i < fetuses.length; i++) {
        if (fetuses[i].deliveryStage !== 'delivered') {
            nextIdx = i;
            break;
        }
    }
    
    if (nextIdx === null) return; // No more fetuses to add
    
    // Activate simultaneous emergence
    const nextFetus = fetuses[nextIdx];
    nextFetus.deliveryStage = 'emerging';
    nextFetus.deliveryProgress = Math.max(10, primaryFetus.deliveryProgress * 0.6); // Start at 60% of primary's progress
    nextFetus.simultaneousWith = primaryIdx;
    nextFetus.laborStartTime = Date.now();
    
    cd.activeEmergingIndices.push(nextIdx);
    cd.simultaneousEmergenceActive = true;
    
    // Link primary to this one
    primaryFetus.simultaneousWith = nextIdx;
    
    // Log event
    if (!cd.eventLog) cd.eventLog = [];
    cd.eventLog.push({
        day: getVirtualDay(bot),
        text: `⚠️ TWO parasites emerging simultaneously! Larva ${primaryIdx + 1} and ${nextIdx + 1} are fighting to exit at the same time!`,
        type: 'simultaneous_emergence'
    });
    
    console.log(`[Delivery] Simultaneous emergence triggered: Larvae ${primaryIdx + 1} and ${nextIdx + 1}`);
}

/**
 * Complete delivery of a specific fetus
 * @param {Object} bot - The pregnant bot
 * @param {number} index - Fetus index to deliver
 * @returns {Object} Delivery result
 */
function deliverFetus(bot, index) {
    const cd = bot.cycleData;
    const fetus = cd.fetuses?.[index];
    
    if (!fetus || fetus.deliveryStage === 'delivered') return null;
    
    fetus.deliveryStage = 'delivered';
    fetus.deliveryProgress = 100;
    fetus.emergenceOrder = (cd.totalDelivered || 0) + 1;
    fetus.deliveryTime = Date.now();
    
    cd.totalDelivered = (cd.totalDelivered || 0) + 1;
    cd.currentEmergingIndex = index + 1;
    
    // Remove from activeEmergingIndices
    if (cd.activeEmergingIndices) {
        cd.activeEmergingIndices = cd.activeEmergingIndices.filter(idx => idx !== index);
        
        // If all active are delivered, reset simultaneous flag and advance to next
        if (cd.activeEmergingIndices.length === 0) {
            cd.simultaneousEmergenceActive = false;
            
            // Find next undelivered fetus to start
            const fetuses = cd.fetuses || [];
            for (let i = index + 1; i < fetuses.length; i++) {
                if (fetuses[i].deliveryStage !== 'delivered') {
                    cd.activeEmergingIndices = [i];
                    cd.currentEmergingIndex = i;
                    break;
                }
            }
        }
    }
    
    // Generate birth description
    const isParasite = cd.isParasitePregnancy;
    const birthDesc = generateBirthDescription(bot, fetus, isParasite, index);
    
    // Log event
    if (!cd.eventLog) cd.eventLog = [];
    cd.eventLog.push({
        day: getVirtualDay(bot),
        text: `${isParasite ? 'Larva' : 'Baby'} #${fetus.emergenceOrder} ${isParasite ? 'emerged' : 'born'}!`,
        type: 'delivery'
    });
    
    saveBots();
    
    console.log(`[Delivery] ${isParasite ? 'Larva' : 'Baby'} ${fetus.emergenceOrder} delivered`);
    
    return {
        fetusIndex: index,
        progress: 100,
        stage: 'delivered',
        delivered: true,
        description: birthDesc,
        isComplete: cd.totalDelivered >= (cd.fetuses || []).length
    };
}

/**
 * Generate a descriptive birth text
 */
function generateBirthDescription(bot, fetus, isParasite, index) {
    const isFirst = index === 0;
    const isLast = index === (bot.cycleData.fetuses || []).length - 1;
    
    if (isParasite) {
        const descriptions = [
            'A writhing larva slithers forth, slick with amniotic fluid and aphrodisiac secretion.',
            'The parasite tears free in a gush of iridescent fluid, its segmented body pulsing with alien life.',
            'With a violent contraction, the larva bursts out, teeth-first, seeking warmth.',
            'The emergence is wet and chaotic - the larva writhes immediately upon contact with air.',
            'A gush of luminescent fluid precedes the larva, which emerges twitching and hungry.'
        ];
        return descriptions[index % descriptions.length];
    } else {
        if (isFirst) return 'The first baby crowns and slips into the waiting hands, crying immediately.';
        if (isLast) return 'The final baby arrives, completing the delivery. The mother collapses in relief.';
        return `Baby number ${index + 1} arrives ${index > 2 ? 'quickly' : 'with effort'}, slippery and wailing.`;
    }
}

/**
 * Complete the entire delivery process
 */
function completeDelivery(bot) {
    const cd = bot.cycleData;
    cd.deliveryInProgress = false;
    cd.birthVirtualDay = getVirtualDay(bot);
    cd.laborStarted = false;
    
    // Add all delivered fetuses to children
    if (!cd.children) cd.children = [];
    cd.fetuses?.forEach(f => {
        if (f.deliveryStage === 'delivered') {
            cd.children.push({
                gender: f.gender || 'unknown',
                nickname: f.nickname || '',
                birthDay: cd.birthVirtualDay,
                type: cd.isParasitePregnancy ? 'parasite' : 'baby'
            });
        }
    });
    
    saveBots();
    
    return {
        complete: true,
        totalDelivered: cd.totalDelivered,
        message: 'All deliveries complete'
    };
}

/**
 * Get current delivery status for UI display
 * @param {Object} bot - The pregnant bot
 * @returns {Object} Full delivery status
 */
function getDeliveryStatus(bot) {
    if (!bot || !bot.cycleData) return null;
    
    const cd = bot.cycleData;
    const fetuses = cd.fetuses || [];
    
    // If pregnancy has ended (birth completed, postpartum), delivery is NOT in progress
    const pregnancyEnded = cd.pregnant === false || cd.birthVirtualDay !== undefined && cd.birthVirtualDay !== null;
    const allDelivered = fetuses.length > 0 && fetuses.every(f => f.deliveryStage === 'delivered');
    
    return {
        inProgress: cd.deliveryInProgress && !pregnancyEnded && !allDelivered,
        currentIndex: cd.currentEmergingIndex || 0,
        activeIndices: cd.activeEmergingIndices || [cd.currentEmergingIndex || 0],
        totalDelivered: cd.totalDelivered || 0,
        totalFetuses: fetuses.length,
        simultaneousActive: cd.simultaneousEmergenceActive || false,
        isParasite: cd.isParasitePregnancy,
        fetuses: fetuses.map((f, i) => ({
            index: i,
            progress: f.deliveryProgress || 0,
            stage: f.deliveryStage || 'gestating',
            emergenceOrder: f.emergenceOrder,
            pushes: f.currentPushes || 0,
            requiredPushes: f.pushEffortRequired || 0,
            simultaneousWith: f.simultaneousWith,
            isCurrent: (cd.activeEmergingIndices || [cd.currentEmergingIndex || 0]).includes(i) && 
                       f.deliveryStage !== 'delivered',
            isActive: (cd.activeEmergingIndices || []).includes(i) && 
                      f.deliveryStage === 'emerging'
        }))
    };
}

/**
 * Manual push action - called when user clicks "Push" or types push commands
 * @param {Object} bot - The pregnant bot
 * @returns {Object|null} Result of push action
 */
function doPushAction(bot) {
    if (!bot || !bot.cycleData?.deliveryInProgress) {
        return { error: 'Not in active labor' };
    }
    
    const result = advanceDeliveryProgress(bot, 'push');
    
    // Render update
    if (typeof renderDeliveryProgress === 'function') {
        renderDeliveryProgress(bot);
    }
    
    return result;
}

// Export functions for use in other modules
window.initDeliveryProgress = initDeliveryProgress;
window.advanceDeliveryProgress = advanceDeliveryProgress;
window.getDeliveryStatus = getDeliveryStatus;
window.doPushAction = doPushAction;
window.deliverFetus = deliverFetus;
