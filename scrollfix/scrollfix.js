// Scroll Fix App

class ScrollFixApp {
    constructor() {
        // Define categories for messages
        // Messages can belong to multiple categories
        this.categories = {
            life: ['life', 'general', 'purpose'],
            people: ['people', 'social', 'general'],
            work: ['work', 'productivity', 'general'],
            school: ['school', 'learning', 'productivity', 'general'],
            kids: ['kids', 'family', 'general'],
            all: [] // special case - show all messages
        };

        // Sayings shown before scrolling (related to scrolling/dopamine/satisfaction)
        // Each saying now has categories
        this.beforeScrollSayings = [
            { text: "Scroll here so you don't get stuck scrolling elsewhere.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Give it a flick, maybe scrolling will fix it.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "They want you to scroll - ad dollars.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Stick it to the man - scroll here instead!", categories: ['all', 'general', 'work', 'life'] },
            { text: "Get your dopamine fix the ad-free way.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Infinite scroll? Try intentional scroll.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Breaking the scroll addiction, one swipe at a time.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Your thumb has better things to scroll than ads.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Reclaim your scroll power!", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Scroll with purpose, not by design.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Give your brain the scroll it deserves.", categories: ['all', 'general', 'life', 'school'] },
            { text: "Mindful scrolling starts here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "The anti-doomscroll scroll.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Scroll without the surveillance.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "Take back your attention, one scroll at a time.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Escape the scroll trap. Start here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Your scroll. Your rules. No trackers.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Skip the algorithm. Embrace the scroll.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "Scrolling for humans, not metrics.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "Stop feeding the algorithm. Feed your soul.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Your attention is valuable. Spend it wisely.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Swipe your way to sanity.", categories: ['all', 'general', 'life', 'people'] },
            { text: "The scroll detox starts now.", categories: ['all', 'general', 'life', 'people'] },
            { text: "No bait. No trap. Just scroll.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Freedom is just a swipe away.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "The scroll revolution will not be monetized.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "Disconnect to reconnect. Scroll away.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "Scroll smarter, not harder.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "The mindful swipe experience.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Take a break from the chaos. Scroll here.", categories: ['all', 'general', 'life', 'work', 'people', 'kids'] },
            { text: "Because you deserve better than clickbait.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "Feeling the urge? Break it here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "One scroll, then back to life.", categories: ['all', 'general', 'life', 'work', 'school', 'kids'] },
            { text: "Interrupt the pattern. Scroll once.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Quick hit, then get going.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Break the cycle. Start here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Their algorithms can't have you.", categories: ['all', 'general', 'life', 'people', 'work'] },
            { text: "This is your intervention scroll.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Redirect the impulse. Scroll here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Stop the habit loop right here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Your time is too valuable for endless feeds.", categories: ['all', 'general', 'life', 'work', 'school', 'people', 'kids'] },
            { text: "Choose purpose over passive scrolling.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Dopamine hit without the guilt trip.", categories: ['all', 'general', 'life', 'people'] },
            { text: "The scroll that reminds you to stop scrolling.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Circuit breaker for your scroll addiction.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Here to help you break free.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "One swipe, then get back out there.", categories: ['all', 'general', 'life', 'work', 'school', 'kids', 'people'] },
            { text: "This isn't a destination, it's a detour.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Scrolling won't solve it. Action will.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Quick reminder: you have goals.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Life's happening. Don't miss it scrolling.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "Snap out of it. Scroll here, then go.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Your future self will thank you.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "The urge is real, but so is your purpose.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Break the trance. Scroll once.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Attention hijacked? Take it back here.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Real life > fake feeds.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "Stop doom-scrolling. Start doing.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "You're better than this impulse.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Wake-up call in scroll form.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Time to choose: scroll or goals?", categories: ['all', 'general', 'life', 'work', 'school'] },
            
            // Category-specific messages
            { text: "Stop avoiding that difficult conversation.", categories: ['people', 'work', 'life', 'kids'] },
            { text: "That project won't finish itself.", categories: ['work', 'school', 'life'] },
            { text: "Your family needs you present, not scrolling.", categories: ['kids', 'people', 'life'] },
            { text: "That homework isn't going anywhere.", categories: ['school', 'life'] },
            { text: "Stop procrastinating. Start creating.", categories: ['work', 'school', 'life'] },
            { text: "Your relationships need attention too.", categories: ['people', 'kids', 'life'] },
            { text: "Work time is work time. Get to it.", categories: ['work', 'life'] },
            { text: "Study now, succeed later.", categories: ['school', 'life'] },
            { text: "Your kids deserve your full attention.", categories: ['kids', 'people', 'life'] },
            { text: "Avoiding people won't solve anything.", categories: ['people', 'life'] },
            { text: "Be present. Be engaged. Be done scrolling.", categories: ['all', 'general', 'life', 'people', 'work', 'school', 'kids'] },
            
            // More work-specific
            { text: "That deadline isn't moving. You need to.", categories: ['work', 'life'] },
            { text: "Your career needs your focus, not your feed.", categories: ['work', 'life'] },
            { text: "Emails won't answer themselves.", categories: ['work', 'life'] },
            { text: "That meeting prep won't do itself.", categories: ['work', 'life'] },
            { text: "Your boss isn't paying you to scroll.", categories: ['work', 'life'] },
            { text: "Professional goals require professional focus.", categories: ['work', 'life'] },
            { text: "Success is built in focused moments, not scrolls.", categories: ['work', 'school', 'life'] },
            { text: "Your coworkers are counting on you.", categories: ['work', 'people', 'life'] },
            
            // More school-specific
            { text: "That essay won't write itself.", categories: ['school', 'life'] },
            { text: "Your GPA thanks you for not scrolling.", categories: ['school', 'life'] },
            { text: "Learning requires attention, not distraction.", categories: ['school', 'life'] },
            { text: "That exam is coming. Are you ready?", categories: ['school', 'life'] },
            { text: "Your education is your future. Focus.", categories: ['school', 'life'] },
            { text: "Study breaks don't last an hour.", categories: ['school', 'life'] },
            { text: "Knowledge won't scroll into your brain.", categories: ['school', 'life'] },
            { text: "Your classmates are studying, not scrolling.", categories: ['school', 'life'] },
            
            // More people-specific
            { text: "That text message needs a real response.", categories: ['people', 'life'] },
            { text: "Your friends miss the real you.", categories: ['people', 'life'] },
            { text: "Social media isn't socializing.", categories: ['people', 'life'] },
            { text: "Real connections beat virtual ones.", categories: ['people', 'life'] },
            { text: "Someone's waiting for your call.", categories: ['people', 'life'] },
            { text: "Face-to-face beats face-in-phone.", categories: ['people', 'life'] },
            { text: "That apology won't make itself.", categories: ['people', 'work', 'kids', 'life'] },
            { text: "Quality time means phone-free time.", categories: ['people', 'kids', 'life'] },
            { text: "They need you present, not distracted.", categories: ['people', 'kids', 'life'] },
            
            // More kids-specific
            { text: "They're only young once. Be there.", categories: ['kids', 'life'] },
            { text: "Your phone can wait. They can't.", categories: ['kids', 'life'] },
            { text: "Parenting requires presence, not scrolling.", categories: ['kids', 'life'] },
            { text: "Those moments are fleeting. Don't miss them.", categories: ['kids', 'life'] },
            { text: "Be the parent who's paying attention.", categories: ['kids', 'life'] },
            { text: "Story time beats screen time.", categories: ['kids', 'life'] },
            { text: "They learn what you model. Model presence.", categories: ['kids', 'life'] },
            { text: "Your attention is their love language.", categories: ['kids', 'life'] },
            { text: "Bedtime routine beats scroll routine.", categories: ['kids', 'life'] },
            { text: "Play with them, not with your phone.", categories: ['kids', 'life'] },
            
            // More life-specific
            { text: "Your dreams need action, not scrolling.", categories: ['life'] },
            { text: "That hobby misses you.", categories: ['life'] },
            { text: "Your health matters more than your feed.", categories: ['life'] },
            { text: "When did you last do something just for you?", categories: ['life'] },
            { text: "That book on your shelf is waiting.", categories: ['life'] },
            { text: "Your passion project is calling.", categories: ['life'] },
            { text: "Self-improvement starts with self-control.", categories: ['life', 'work', 'school'] },
            { text: "Live your life, don't watch others live theirs.", categories: ['life', 'people'] },
            { text: "Your bucket list won't complete itself.", categories: ['life'] },
            { text: "Today's goals won't wait for tomorrow.", categories: ['life', 'work', 'school'] }
        ];

        // Feel-good sayings shown after scrolling
        this.afterScrollSayings = [
            { text: "You got this!", categories: ['all', 'general', 'life', 'work', 'school', 'people', 'kids'] },
            { text: "Now get back to work.", categories: ['work', 'school', 'life'] },
            { text: "Ah, that's better.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Feeling good? Good.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Perfect. Now go be productive.", categories: ['work', 'school', 'life'] },
            { text: "There you go! Mission accomplished.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Nice scroll! Back to reality.", categories: ['all', 'general', 'life', 'work', 'school', 'people', 'kids'] },
            { text: "Dopamine delivered. You're welcome.", categories: ['all', 'general', 'life', 'people'] },
            { text: "That hit the spot, didn't it?", categories: ['all', 'general', 'life', 'people'] },
            { text: "Scroll complete. Life continues.", categories: ['all', 'general', 'life', 'people', 'work', 'school', 'kids'] },
            { text: "See? Wasn't that refreshing?", categories: ['all', 'general', 'life', 'people'] },
            { text: "Got what you needed? Great!", categories: ['all', 'general', 'life', 'people'] },
            { text: "And... we're good. Carry on.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Scroll fix applied successfully.", categories: ['all', 'general', 'life', 'people', 'work', 'school'] },
            { text: "Itch scratched. Moving on!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "That'll do. Now conquer the day!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Boom. Done. Next!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "You're welcome. Now go shine.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Mission complete. Return to awesome.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "And scene. Back to your regularly scheduled life.", categories: ['all', 'general', 'life', 'people', 'work', 'school', 'kids'] },
            { text: "Smooth. Like butter. Carry on.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Nailed it. What's next?", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Victory! Now use this power wisely.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "That's the stuff. Go forth.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Reset complete. You're ready.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "There it is. Feeling refreshed?", categories: ['all', 'general', 'life', 'people'] },
            { text: "Done and done. Onward!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Check. Now go do amazing things.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Perfect scroll. Perfect timing.", categories: ['all', 'general', 'life', 'people'] },
            { text: "That worked, didn't it?", categories: ['all', 'general', 'life', 'people'] },
            { text: "Quick hit delivered. Stay focused.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "You came, you scrolled, you conquered.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Refreshed and ready. Let's go!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "That's how it's done.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Quick fix administered. Proceed.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Scroll successful. Resume greatness.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Fixed. Now back to being brilliant.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Scratch that itch. Move that mountain.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Done scrolling? Start doing!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Relief delivered. Action awaits.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Feeling centered? Excellent.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Quick reset, maximum impact.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Urge interrupted. Now move forward.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Circuit broken. Keep going!", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Habit disrupted. Stay strong!", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "That's enough. Time to create.", categories: ['work', 'school', 'life'] },
            { text: "Reminder received. Goals await.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Pattern interrupted. Choose wisely.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Scroll over. Purpose calls.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Good. Now go be awesome.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Reset successful. Time's ticking.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Impulse handled. Back to reality.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Done here. Your life needs you.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "That's all. Nothing more to see.", categories: ['all', 'general', 'life', 'people'] },
            { text: "Quick break over. Action time!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Urge satisfied. Dreams await.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Snap back complete. Go do it!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Reminder served. Now execute.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Wake-up call delivered. Rise up!", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Pause complete. Time to act.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "That's your dose. Now create.", categories: ['work', 'school', 'life'] },
            { text: "Detour finished. Back on track!", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Intervention complete. Stay focused.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Pattern broken. Keep breaking it.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "There. Now go change the world.", categories: ['all', 'general', 'life', 'work', 'school', 'people'] },
            { text: "Alert delivered. Purpose over pleasure.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Good scroll. Better life awaits.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "Done. Your goals won't achieve themselves.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Reset. Refocus. Resume.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "Moment passed. Make it count.", categories: ['all', 'general', 'life', 'work', 'school'] },
            { text: "That's all you needed. Go live.", categories: ['all', 'general', 'life', 'people', 'kids'] },
            { text: "Now tackle that conversation.", categories: ['people', 'work', 'kids'] },
            { text: "Back to work. Make it count.", categories: ['work', 'life'] },
            { text: "Time to engage with your family.", categories: ['kids', 'people', 'life'] },
            { text: "Studies await. Get to it!", categories: ['school', 'life'] },
            { text: "Stop avoiding. Start connecting.", categories: ['people', 'life', 'kids'] },
            { text: "Your workspace calls. Answer it.", categories: ['work', 'life'] },
            { text: "Hit the books. Make yourself proud.", categories: ['school', 'life'] },
            { text: "Be the parent your kids need.", categories: ['kids', 'life'] },
            { text: "Face them. You're stronger than you think.", categories: ['people', 'work', 'life'] },
            
            // More work-specific
            { text: "That report needs finishing. Go!", categories: ['work', 'life'] },
            { text: "Meeting prep time. You've got this.", categories: ['work', 'life'] },
            { text: "Your desk is waiting. Conquer it.", categories: ['work', 'life'] },
            { text: "Colleagues need you. Be there.", categories: ['work', 'people', 'life'] },
            { text: "Inbox zero starts now.", categories: ['work', 'life'] },
            { text: "Time to earn that paycheck.", categories: ['work', 'life'] },
            { text: "Professional excellence awaits.", categories: ['work', 'life'] },
            { text: "Career goals need action. Move!", categories: ['work', 'life'] },
            
            // More school-specific
            { text: "Back to learning. You're doing great.", categories: ['school', 'life'] },
            { text: "That assignment awaits. Crush it.", categories: ['school', 'life'] },
            { text: "Study mode: activated.", categories: ['school', 'life'] },
            { text: "Your future starts with this study session.", categories: ['school', 'life'] },
            { text: "Notes won't take themselves. Go!", categories: ['school', 'life'] },
            { text: "Academic excellence is yours. Claim it.", categories: ['school', 'life'] },
            { text: "Brain recharged. Back to learning.", categories: ['school', 'life'] },
            { text: "Graduation starts with this moment.", categories: ['school', 'life'] },
            
            // More people-specific
            { text: "Time for real connection. Call them.", categories: ['people', 'life'] },
            { text: "They're worth more than a scroll. Go.", categories: ['people', 'life'] },
            { text: "Real conversations beat screen time.", categories: ['people', 'life'] },
            { text: "Your presence is a gift. Share it.", categories: ['people', 'kids', 'life'] },
            { text: "Relationships need nurturing. Start now.", categories: ['people', 'life'] },
            { text: "Face-to-face time. Make it happen.", categories: ['people', 'life'] },
            { text: "Someone needs your attention. Give it.", categories: ['people', 'kids', 'life'] },
            { text: "Be the friend you'd want.", categories: ['people', 'life'] },
            
            // More kids-specific
            { text: "Playtime! They'll remember this.", categories: ['kids', 'life'] },
            { text: "Be present. They grow too fast.", categories: ['kids', 'life'] },
            { text: "Your kids need you now. Go!", categories: ['kids', 'life'] },
            { text: "Story time beats screen time. Always.", categories: ['kids', 'life'] },
            { text: "Make memories, not excuses.", categories: ['kids', 'life'] },
            { text: "Parent mode: fully engaged.", categories: ['kids', 'life'] },
            { text: "They need you present. Be there.", categories: ['kids', 'life'] },
            { text: "Quality time starts now.", categories: ['kids', 'people', 'life'] },
            { text: "Love them with your attention.", categories: ['kids', 'life'] },
            { text: "Childhood is fleeting. Be there.", categories: ['kids', 'life'] },
            
            // More life-specific
            { text: "Your dreams are waiting. Chase them.", categories: ['life'] },
            { text: "That workout won't do itself.", categories: ['life'] },
            { text: "Self-care time. You deserve it.", categories: ['life'] },
            { text: "Life's too short to waste scrolling.", categories: ['life'] },
            { text: "Your passion project needs you.", categories: ['life'] },
            { text: "Make today count. Start now.", categories: ['life', 'work', 'school'] },
            { text: "The real world is calling. Answer.", categories: ['life', 'people', 'kids'] },
            { text: "Purpose over distraction. Always.", categories: ['life', 'work', 'school'] }
        ];

        // Available flip animations
        this.flipAnimations = ['flip1', 'flip2', 'flip3', 'flip4', 'flip5'];

        this.firstVisit = true;
        this.canScroll = true;
        this.scrollHistory = [];
        this.todayScrollCount = 0;
        this.lastScrollTime = null;
        this.nextScrollAllowedTime = null;
        this.cooldownTimer = null;
        this.currentAfterMessage = null;
        this.daysFixed = 0; // Track number of unique days the app has been used
        this.usageDates = new Set(); // Track unique dates when the app was used
        this.selectedCategory = 'life'; // Default category
        
        this.initializeElements();
        this.loadFromLocalStorage();
        this.initializeTheme();
        this.initializeEventListeners();
        this.initializeCategorySelector();
        this.checkCooldown();
        this.updateDisplay();
    }

    initializeElements() {
        this.card = document.getElementById('scroll-card');
        this.cardText = document.getElementById('card-text');
        this.instructions = document.getElementById('instructions');
        this.daysCounter = document.getElementById('days-counter');
        this.daysFixedElement = document.getElementById('days-fixed');
        this.scrollCount = document.getElementById('scroll-count');
        this.historyToggle = document.getElementById('history-toggle');
        this.historyList = document.getElementById('history-list');
        this.categoryDisplay = document.getElementById('category-display');
        this.categoryDropdown = document.getElementById('category-dropdown');
    }

    initializeCategorySelector() {
        // Set initial display text
        this.updateCategoryDisplay();

        // Track if a touch event was handled to prevent double-firing
        let touchHandled = false;
        const TOUCH_HANDLED_TIMEOUT = 500; // ms to wait before allowing click events again

        // Helper function to handle category selection
        const selectCategory = (option) => {
            const category = option.dataset.category;
            if (category) {
                this.selectedCategory = category;
                this.updateCategoryDisplay();
                this.categoryDropdown.classList.remove('visible');
                this.saveToLocalStorage();
                this.updateDisplay();
            }
        };

        // Toggle dropdown on display click
        this.categoryDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.categoryDropdown.classList.toggle('visible');
        });

        // Add click and touch handlers to all category options
        const options = this.categoryDropdown.querySelectorAll('.category-option');
        options.forEach(option => {
            // Touch handler for mobile devices
            option.addEventListener('touchend', (e) => {
                e.stopPropagation();
                e.preventDefault();
                touchHandled = true;
                selectCategory(option);
                // Reset the flag after a short delay
                setTimeout(() => { touchHandled = false; }, TOUCH_HANDLED_TIMEOUT);
            }, { passive: false });
            
            // Click handler for desktop (only fires if touch wasn't handled)
            option.addEventListener('click', (e) => {
                if (touchHandled) {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                selectCategory(option);
            });
        });

        // Close dropdown when clicking outside
        const closeDropdown = (e) => {
            if (!this.categoryDisplay.contains(e.target) && !this.categoryDropdown.contains(e.target)) {
                this.categoryDropdown.classList.remove('visible');
            }
        };
        
        document.addEventListener('click', closeDropdown);
        document.addEventListener('touchend', closeDropdown, { passive: true });
    }

    updateCategoryDisplay() {
        // Capitalize first letter of category
        const displayText = this.selectedCategory.charAt(0).toUpperCase() + this.selectedCategory.slice(1);
        this.categoryDisplay.textContent = displayText;

        // Update selected state in dropdown
        const options = this.categoryDropdown.querySelectorAll('.category-option');
        options.forEach(option => {
            if (option.dataset.category === this.selectedCategory) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }

    getFilteredMessages(messages) {
        return messages.filter(msg => msg.categories.includes(this.selectedCategory));
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem('appTheme') || 'default';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-warm-light', 'theme-warm-dark',
            'theme-red', 'theme-pink', 'theme-red-dark', 'theme-pink-dark', 'theme-black', 'theme-blue', 'theme-blue-dark');

        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }

        document.querySelectorAll('.theme-btn-active').forEach(btn => {
            btn.className = `theme-btn-active theme-${theme}`;
        });

        localStorage.setItem('appTheme', theme);
    }

    initializeEventListeners() {
        // Theme picker
        const themePicker = document.querySelector('.theme-picker');
        const themeDropdown = document.querySelector('.theme-dropdown');

        themePicker.addEventListener('click', (e) => {
            if (e.target.closest('.theme-btn-active')) {
                const isVisible = themeDropdown.style.display === 'grid';
                themeDropdown.style.display = isVisible ? 'none' : 'grid';
            }
        });

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTheme(btn.dataset.theme);
                themeDropdown.style.display = 'none';
            });
        });

        document.addEventListener('click', (e) => {
            if (!themePicker.contains(e.target)) {
                themeDropdown.style.display = 'none';
            }
        });

        // Card swipe handling
        let touchStartY = 0;
        let touchStartX = 0;

        this.card.addEventListener('touchstart', (e) => {
            if (!this.canScroll) return;
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });

        this.card.addEventListener('touchend', (e) => {
            if (!this.canScroll) return;
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const deltaY = touchStartY - touchEndY;
            const deltaX = Math.abs(touchStartX - touchEndX);
            
            // Swipe up detection (more vertical than horizontal)
            if (deltaY > 50 && deltaX < 50) {
                this.handleScroll();
            }
        });

        // Mouse click as alternative to swipe
        this.card.addEventListener('click', () => {
            if (this.canScroll) {
                this.handleScroll();
            }
        });

        // History toggle
        this.historyToggle.addEventListener('click', () => {
            this.historyList.classList.toggle('visible');
            this.historyToggle.textContent = this.historyList.classList.contains('visible') 
                ? 'Hide Scroll History' 
                : 'View Scroll History';
            this.renderHistory();
        });
    }

    handleScroll() {
        if (!this.canScroll) return;

        const now = Date.now();

        // Disable further scrolling
        this.canScroll = false;
        this.card.classList.add('disabled');
        this.card.classList.add('after-scroll');

        // Select a random flip animation
        const randomAnimation = this.flipAnimations[Math.floor(Math.random() * this.flipAnimations.length)];
        this.card.classList.add(randomAnimation);

        // Get a random "after scroll" message and save it
        this.currentAfterMessage = this.getRandomAfterSaying();

        // Change text during flip
        setTimeout(() => {
            this.cardText.textContent = this.currentAfterMessage;
        }, 300);

        // Log the scroll
        this.logScroll();

        // Fixed 2-minute cooldown
        const cooldownTime = 2 * 60 * 1000; // 2 minutes in milliseconds
        this.nextScrollAllowedTime = now + cooldownTime + 600; // +600ms for animation
        this.lastScrollTime = now;

        // Remove animation class after animation completes
        setTimeout(() => {
            this.card.classList.remove(randomAnimation);
            this.startCooldown();
        }, 600);

        this.saveToLocalStorage();
    }

    logScroll() {
        const now = new Date();
        const scrollEntry = {
            timestamp: now.toISOString(),
            date: now.toLocaleDateString(),
            time: now.toLocaleTimeString(),
            category: this.selectedCategory
        };

        this.scrollHistory.push(scrollEntry);
        this.todayScrollCount++;
        
        // Update days fixed when a scroll is logged
        this.updateDaysFixed();

        console.log('Scroll logged:', scrollEntry);

        this.saveToLocalStorage();
        
        // Update display to show new counts
        this.updateDisplay();
    }

    getRandomBeforeSaying() {
        const filteredSayings = this.getFilteredMessages(this.beforeScrollSayings);
        
        if (this.firstVisit && this.scrollHistory.length === 0) {
            this.firstVisit = false;
            // Return first filtered saying or the very first saying if filter is empty
            if (filteredSayings.length > 0) {
                return filteredSayings[0].text;
            }
            return this.beforeScrollSayings[0].text;
        }
        
        if (filteredSayings.length === 0) {
            // Fallback to general messages if no category match
            const generalSayings = this.beforeScrollSayings.filter(msg => 
                msg.categories.includes('all') || msg.categories.includes('general')
            );
            const randomIndex = Math.floor(Math.random() * generalSayings.length);
            return generalSayings[randomIndex].text;
        }
        
        const randomIndex = Math.floor(Math.random() * filteredSayings.length);
        return filteredSayings[randomIndex].text;
    }

    getRandomAfterSaying() {
        const filteredSayings = this.getFilteredMessages(this.afterScrollSayings);
        
        if (filteredSayings.length === 0) {
            // Fallback to general messages if no category match
            const generalSayings = this.afterScrollSayings.filter(msg => 
                msg.categories.includes('all') || msg.categories.includes('general')
            );
            const randomIndex = Math.floor(Math.random() * generalSayings.length);
            return generalSayings[randomIndex].text;
        }
        
        const randomIndex = Math.floor(Math.random() * filteredSayings.length);
        return filteredSayings[randomIndex].text;
    }

    updateDisplay() {
        // Update card text based on cooldown state
        if (this.canScroll) {
            this.cardText.textContent = this.getRandomBeforeSaying();
        } else if (this.currentAfterMessage) {
            // Keep showing the saved "after scroll" message during cooldown
            this.cardText.textContent = this.currentAfterMessage;
        }

        // Update days fixed counter
        this.daysFixedElement.textContent = `Days fixed: ${this.daysFixed}`;

        // Calculate days since last scroll
        const daysSinceLastScroll = this.getDaysSinceLastScroll();
        if (daysSinceLastScroll === 0) {
            this.daysCounter.textContent = `0 days with no scrolling`;
        } else if (daysSinceLastScroll === 1) {
            this.daysCounter.textContent = `1 day with no scrolling`;
        } else {
            this.daysCounter.textContent = `${daysSinceLastScroll} days with no scrolling`;
        }

        // Update scroll count for today
        if (this.todayScrollCount > 0) {
            this.scrollCount.textContent = `You've scrolled ${this.todayScrollCount} time${this.todayScrollCount === 1 ? '' : 's'} today`;
        } else {
            this.scrollCount.textContent = '';
        }

        // Update instructions
        if (this.canScroll) {
            this.instructions.textContent = '👆 Swipe up on the card to scroll';
        } else if (this.nextScrollAllowedTime) {
            this.updateCooldownDisplay();
        } else {
            this.instructions.textContent = '⏳ Wait a moment before scrolling again...';
        }
    }

    updateCooldownDisplay() {
        const now = Date.now();
        const remaining = this.nextScrollAllowedTime - now;

        if (remaining <= 0) {
            this.canScroll = true;
            this.card.classList.remove('disabled');
            this.card.classList.remove('after-scroll');
            this.nextScrollAllowedTime = null;
            this.currentAfterMessage = null;
            this.instructions.textContent = '👆 Swipe up on the card to scroll';
            if (this.cooldownTimer) {
                clearInterval(this.cooldownTimer);
                this.cooldownTimer = null;
            }
            this.updateDisplay();
            this.saveToLocalStorage();
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        if (minutes > 0) {
            this.instructions.textContent = `⏳ Next scroll available in ${minutes}m ${seconds}s`;
        } else {
            this.instructions.textContent = `⏳ Next scroll available in ${seconds}s`;
        }
    }

    startCooldown() {
        if (this.cooldownTimer) {
            clearInterval(this.cooldownTimer);
        }

        this.cooldownTimer = setInterval(() => {
            this.updateCooldownDisplay();
        }, 1000);
    }

    checkCooldown() {
        // On app load, check if we're still in cooldown
        if (this.nextScrollAllowedTime) {
            const now = Date.now();
            if (now < this.nextScrollAllowedTime) {
                this.canScroll = false;
                this.card.classList.add('disabled');
                this.card.classList.add('after-scroll');
                this.startCooldown();
            } else {
                this.canScroll = true;
                this.nextScrollAllowedTime = null;
                this.currentAfterMessage = null;
            }
        }
    }

    getDaysSinceLastScroll() {
        if (this.scrollHistory.length === 0) {
            return 0;
        }

        // Get the most recent scroll entry
        const lastScroll = new Date(this.scrollHistory[this.scrollHistory.length - 1].timestamp);
        const now = new Date();
        
        // Set both dates to midnight to compare only dates, not times
        const lastScrollDate = new Date(lastScroll.getFullYear(), lastScroll.getMonth(), lastScroll.getDate());
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Calculate the difference in days
        const diffTime = todayDate - lastScrollDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    updateDaysFixed() {
        const today = new Date().toLocaleDateString();
        this.usageDates.add(today);
        this.daysFixed = this.usageDates.size;
    }

    getScrollsToday() {
        const today = new Date().toLocaleDateString();
        return this.scrollHistory.filter(entry => entry.date === today).length;
    }

    renderHistory() {
        if (this.scrollHistory.length === 0) {
            this.historyList.innerHTML = '<div class="no-history">No scrolls yet. Get started!</div>';
            return;
        }

        // Group by date
        const groupedByDate = {};
        this.scrollHistory.forEach(entry => {
            if (!groupedByDate[entry.date]) {
                groupedByDate[entry.date] = [];
            }
            groupedByDate[entry.date].push(entry);
        });

        // Render in reverse chronological order
        const dates = Object.keys(groupedByDate).reverse();
        const html = dates.map(date => {
            const entries = groupedByDate[date].reverse();
            return `
                <div class="history-item">
                    <strong>${date}</strong> - ${entries.length} scroll${entries.length === 1 ? '' : 's'}
                    ${entries.map(entry => {
                        const categoryText = entry.category ? ` (${entry.category})` : '';
                        return `<div class="history-item-time">• ${entry.time}${categoryText}</div>`;
                    }).join('')}
                </div>
            `;
        }).join('');

        this.historyList.innerHTML = html;
    }

    saveToLocalStorage() {
        const data = {
            scrollHistory: this.scrollHistory,
            lastSaveDate: new Date().toLocaleDateString(),
            lastScrollTime: this.lastScrollTime,
            nextScrollAllowedTime: this.nextScrollAllowedTime,
            currentAfterMessage: this.currentAfterMessage,
            usageDates: Array.from(this.usageDates),
            selectedCategory: this.selectedCategory
        };
        localStorage.setItem('scrollFixData', JSON.stringify(data));
    }

    loadFromLocalStorage() {
        const today = new Date().toLocaleDateString();
        const data = localStorage.getItem('scrollFixData');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.scrollHistory = parsed.scrollHistory || [];
                this.lastScrollTime = parsed.lastScrollTime || null;
                this.nextScrollAllowedTime = parsed.nextScrollAllowedTime || null;
                this.currentAfterMessage = parsed.currentAfterMessage || null;
                // Handle legacy 'all' category and default to 'life'
                const savedCategory = parsed.selectedCategory || 'life';
                this.selectedCategory = (savedCategory === 'all') ? 'life' : savedCategory;
                
                // Load usage dates
                if (parsed.usageDates) {
                    this.usageDates = new Set(parsed.usageDates);
                } else {
                    // If usageDates doesn't exist, calculate it from scrollHistory
                    this.usageDates = new Set();
                    this.scrollHistory.forEach(entry => {
                        this.usageDates.add(entry.date);
                    });
                }
                
                // Add today to usage dates (counts as "using" the app)
                this.updateDaysFixed();
                
                // Reset today's count based on actual data
                this.todayScrollCount = this.getScrollsToday();

                // If it's a new day, reset the daily count
                if (parsed.lastSaveDate !== today) {
                    this.saveToLocalStorage(); // Update the last save date
                }
            } catch (e) {
                console.error('Failed to load data from localStorage:', e);
            }
        } else {
            // First time using the app
            this.updateDaysFixed();
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ScrollFixApp();
});
