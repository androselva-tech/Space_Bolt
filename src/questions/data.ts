/**
 * The question bank: one line per question.
 *
 *   tier|picture|question|correct answer|wrong 1|wrong 2|wrong 3|did-you-know fact
 *
 * - tier 1 (very easy, about age 6) … 6 (hard, about age 13–14)
 * - True/false: write the statement as the question, TRUE or FALSE as the answer, and leave the
 *   wrong answers empty (`|TRUE|FALSE|||`); the game shows TRUE and FALSE buttons.
 * - picture: one emoji shown with the question (it may hint, never give the answer away).
 *
 * Each subject builds one part of the rocket (rules.ts PARTS):
 *   physics → ENGINE, space → FUEL TANK, chemistry → SHIELD, body → LIFE SUPPORT.
 * Logic (puzzles, patterns and maths) fixes faults in flight and repairs at the space station.
 */
export type Subject = 'physics' | 'space' | 'chemistry' | 'body' | 'logic';

export const BANK: Record<Subject, string> = {
  space: `
1|☀️|What is the Sun?|A star|A planet|A moon|A comet|The Sun is a star: the closest one to Earth.
1|🌍|Which planet do we live on?|Earth|Mars|Venus|Jupiter|Earth is the third planet from the Sun.
1|🌙|What goes around the Earth about once a month?|The Moon|The Sun|Mars|A comet|The Moon circles Earth about every 27 days.
1|🚀|What do we call a person who travels to space?|Astronaut|Pilot|Sailor|Driver|Astronauts train for years before they fly.
1|⭐|Stars are only in the sky at night.|FALSE|TRUE|||Stars are always there; in the daytime the Sun's light hides them.
1|🔴|Which planet is called the Red Planet?|Mars|Earth|Neptune|Venus|Rusty iron dust makes Mars look red.
1|💍|Which planet has big, bright rings?|Saturn|Mars|Mercury|Earth|Saturn's rings are made of ice and rock.
1|🌞|What gives Earth its light and heat?|The Sun|The Moon|Mars|The clouds|Sunlight takes about 8 minutes to reach us.
1|🔭|What do we use to look at faraway stars?|Telescope|Microscope|Periscope|Stethoscope|A telescope gathers light, so faint stars look brighter.
1|🌑|The Moon makes its own light.|FALSE|TRUE|||Moonlight is sunlight bouncing off the Moon.
2|🥵|Which planet is closest to the Sun?|Mercury|Venus|Earth|Mars|Mercury races around the Sun in just 88 days.
2|🪐|What is the biggest planet in our solar system?|Jupiter|Saturn|Earth|Neptune|More than 1,000 Earths could fit inside Jupiter.
2|🔢|How many planets are in our solar system?|8|9|7|10|Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune.
2|📅|How long does Earth take to go once around the Sun?|One year|One day|One month|One week|That trip of about 365 days is one year.
2|🔄|Earth spinning around once makes one ...|Day|Year|Month|Season|One spin takes about 24 hours.
2|👣|Who was the first person to walk on the Moon?|Neil Armstrong|Yuri Gagarin|Albert Einstein|Isaac Newton|Neil Armstrong stepped onto the Moon in 1969.
2|🌌|What is the name of our galaxy?|The Milky Way|Andromeda|The Big Dipper|Orion|Our Sun is one of billions of stars in the Milky Way.
2|☄️|What do we call a ball of ice and dust with a glowing tail?|Comet|Planet|Moon|Star|A comet's tail grows as the Sun heats its ice.
2|🌗|Why does the Moon seem to change shape?|We see different parts of it lit by the Sun|It shrinks and grows|Clouds cover parts of it|It spins very fast|These changing shapes are called the Moon's phases.
2|🔥|Venus is the hottest planet.|TRUE|FALSE|||Venus's thick clouds trap heat, so it is even hotter than Mercury.
3|🌀|What force keeps the planets going around the Sun?|Gravity|Magnetism|Wind|Friction|The Sun's gravity holds the whole solar system together.
3|🛰️|What is a satellite?|Something that orbits a planet|A kind of star|A space rock that burns up|A rocket engine|The Moon is a natural satellite; we launch man-made ones too.
3|🌠|A shooting star is really a ...|Meteor|Star|Planet|Comet|It's a small space rock burning up in our air.
3|🪨|Where is the asteroid belt?|Between Mars and Jupiter|Between Earth and Mars|Past Neptune|Around the Moon|Millions of rocky asteroids orbit there.
3|↪️|Which planet spins on its side?|Uranus|Saturn|Mercury|Mars|Uranus is tilted so far it seems to roll around the Sun.
3|🔵|Which planet is farthest from the Sun?|Neptune|Uranus|Saturn|Mercury|Pluto is now a dwarf planet, so Neptune is the farthest planet.
3|🏠|What is the International Space Station?|A lab where astronauts live in orbit|A rocket launch pad|A telescope on the Moon|A base on Mars|Astronauts have lived on the ISS since the year 2000.
3|🌘|What happens in a solar eclipse?|The Moon blocks the Sun|Earth blocks the Moon|The Sun goes out|Clouds hide the Sun|The Moon's shadow falls on part of the Earth.
3|🌪️|Jupiter's Great Red Spot is a giant ...|Storm|Volcano|Ocean|Crater|This storm is wider than the whole Earth.
3|😮‍💨|There is air to breathe in space.|FALSE|TRUE|||Space is almost empty, so astronauts carry their own air.
4|💡|What is a light-year?|The distance light travels in a year|The time light takes to reach Earth|A year on another planet|A very sunny year|One light-year is about 9.5 trillion kilometres.
4|🔆|Which star is closest to Earth?|The Sun|Proxima Centauri|Sirius|The North Star|After the Sun, the next closest star is Proxima Centauri.
4|🌋|What is the tallest volcano in the solar system?|Olympus Mons|Mount Everest|Mauna Kea|Mount Fuji|Olympus Mons on Mars is about 2.5 times as tall as Everest.
4|⚖️|On the Moon, you would weigh ...|Less than on Earth|More than on Earth|The same as on Earth|Nothing at all|The Moon's gravity is about one sixth of Earth's.
4|🌕|Which planet has the most known moons?|Saturn|Earth|Mars|Mercury|Saturn has well over 100 known moons.
4|🍂|Why does Earth have seasons?|Earth's axis is tilted|Earth gets much closer to the Sun in summer|The Sun gets hotter and cooler|The Moon blocks the Sun|The tilt changes how directly sunlight hits each half of Earth.
4|🌫️|What is a nebula?|A giant cloud of gas and dust|A dead planet|A fast comet|A group of moons|New stars are born inside nebulas.
4|🐢|Which planet has a day that is longer than its year?|Venus|Earth|Jupiter|Mars|Venus spins so slowly that one day lasts longer than its year.
4|🚀|Rocket engines carry their own oxygen to burn fuel in space.|TRUE|FALSE|||Burning needs oxygen, and space has almost none, so rockets bring it.
4|🧲|Earth's magnetic field protects us from the solar wind.|TRUE|FALSE|||It steers charged particles away, and makes the glowing auroras.
5|🕳️|What is a black hole?|A place where gravity is so strong not even light escapes|A hole in a planet|An empty part of space|A star that has cooled down|Black holes form when huge stars collapse.
5|💥|What is a supernova?|A huge star exploding|A new planet forming|Two moons crashing|A very bright comet|A supernova can outshine a whole galaxy for weeks.
5|🌞|What is the Sun mostly made of?|Hydrogen and helium|Rock and iron|Oxygen and carbon|Burning coal|The Sun turns hydrogen into helium, releasing energy.
5|⚛️|How does the Sun make its energy?|Nuclear fusion|Burning wood|Chemical batteries|Friction|Hydrogen atoms fuse into helium in the Sun's core.
5|⏱️|About how long does sunlight take to reach Earth?|8 minutes|8 seconds|8 hours|8 days|Light crosses the 150 million km in about 8 minutes and 20 seconds.
5|🌀|Which big galaxy is our nearest large neighbour?|Andromeda|The Milky Way|Orion|The Kuiper Belt|Andromeda is about 2.5 million light-years away.
5|📡|What was the first artificial satellite?|Sputnik 1|Apollo 11|Hubble|Voyager 1|The Soviet Union launched Sputnik 1 in 1957.
5|🧑‍🚀|Who was the first human in space?|Yuri Gagarin|Neil Armstrong|Valentina Tereshkova|Buzz Aldrin|Yuri Gagarin orbited Earth in 1961.
5|❄️|Pluto is now called a ...|Dwarf planet|Moon|Comet|Star|Since 2006, Pluto has been classed as a dwarf planet.
5|🌊|Scientists think Jupiter's moon Europa has an ocean under its ice.|TRUE|FALSE|||It's one of the best places to look for life beyond Earth.
6|🔴|What is a red giant?|A huge, cooler star near the end of its life|A red planet|A young, very hot star|A storm on Jupiter|Our Sun will swell into a red giant in about 5 billion years.
6|🔍|What is an exoplanet?|A planet orbiting a star other than the Sun|A planet with no moons|A planet outside the asteroid belt|A planet made of gas|Astronomers have found thousands of exoplanets.
6|🔭|Which space telescope launched in 2021 to see the first galaxies?|James Webb Space Telescope|Hubble Space Telescope|Kepler|Galileo|Webb sees in infrared light, which passes through dust.
6|📏|What is an astronomical unit (AU)?|The average distance from Earth to the Sun|One light-year|The width of the Milky Way|The distance to the Moon|1 AU is about 150 million kilometres.
6|🏎️|To escape Earth's gravity a rocket needs a speed of about ...|11 km per second|11 km per hour|1 km per second|110 km per second|That's about 40,000 kilometres per hour.
6|💫|What is a neutron star?|The tiny, super-dense core left after a supernova|A star made of water|A newborn star|A star that gives no light at all|A teaspoon of it would weigh about a billion tonnes.
6|🌊|What mainly causes the ocean tides on Earth?|The Moon's gravity|The wind|Earth's spin alone|Underwater volcanoes|The Sun's gravity adds a smaller pull too.
6|🌈|Astronomers split starlight into colours to find out ...|What the star is made of|How far away the Moon is|Which way Earth spins|How many planets it has|Each element leaves its own pattern of lines in the spectrum.
6|🛸|Voyager 1 is the human-made object farthest from Earth.|TRUE|FALSE|||Launched in 1977, it has travelled into interstellar space.
6|🎆|The Big Bang theory says the Universe began about ...|13.8 billion years ago|4.5 billion years ago|1 million years ago|100 billion years ago|Earth formed much later, about 4.5 billion years ago.
1|🌙|The Moon is covered in grey dust and rocks.|TRUE|FALSE|||The fine, powdery Moon dust is called regolith.
1|🚩|What did the Apollo astronauts plant on the Moon to show they had been there?|A flag|A tree|A swimming pool|A snowman|Six flags were planted by Apollo crews.
1|🌍|From the Moon, which big blue planet can you see in the sky?|Earth|Mars|Jupiter|Venus|From the Moon, Earth looks almost four times wider than the Moon looks from Earth.
1|👨‍🚀|What do astronauts wear to stay alive outside their spacecraft?|A spacesuit|A raincoat|A swimsuit|Pyjamas|A spacesuit holds air, keeps the right temperature and blocks harmful sunlight.
1|🏠|The International Space Station flies around the ...|Earth|Moon|Sun|Mars|It circles Earth about 16 times a day.
2|👣|Footprints left on the Moon can last for millions of years because ...|There is no wind or rain to wipe them away|Moon dust is sticky glue|Robots guard them|They are made of stone|With no air, nothing blows the dust around.
2|🌑|Which side of the Moon do we see from Earth?|Always the same side|A different side every night|Only the far side|Both sides at once|The Moon spins once for every trip around Earth, so the same face always points at us.
2|🛰️|About how far away is the Moon?|About 384,000 km|About 1,000 km|About 150 million km|About 40 km|A car driving non-stop at motorway speed would take about five months to get there.
2|🚀|What were the missions called that took people to the Moon?|Apollo|Voyager|Hubble|Sputnik|Apollo 11 landed first, in July 1969.
2|🌊|Space capsules like Apollo came home by landing in the ...|Sea|Desert|Moon|Forest|The water cushioned the landing, and ships picked up the crew.
3|🕳️|What made most of the round craters on the Moon?|Rocks from space crashing into it|Moon volcanoes erupting|Astronauts digging|Moon rain|Without air to burn them up, even small space rocks hit the Moon at full speed.
3|🌡️|Why does the Moon get boiling hot by day and freezing cold at night?|It has no air to spread and hold the heat|It is made of metal|It is very close to the Sun|It spins very fast|Moon days reach about 120 °C and nights fall to about −170 °C.
3|📡|Why do astronauts on the Moon need radios to talk to each other?|There is no air to carry their voices|Their helmets are too thick|The Moon is too noisy|Sound is too slow there|Sound needs something to travel through, like air.
3|🌞|How long is one full day and night on the Moon, from sunrise to sunrise?|About 29.5 Earth days|24 hours|One Earth week|One Earth year|So sunlight lasts about two weeks, and then night lasts about two weeks.
3|🧑‍🚀|How many people have walked on the Moon?|12|2|50|0|They all flew on Apollo missions between 1969 and 1972.
4|🔄|What is a spacecraft doing when it is in orbit around the Moon?|Falling around it without hitting it|Parked still above it|Tied to it with a rope|Bouncing on its surface|Orbits around any world work the same way: sideways speed plus gravity.
4|⏲️|About how long does the International Space Station take to go once around Earth?|About 90 minutes|About 1 day|About 1 month|About 1 year|The crew sees around 16 sunrises every day.
4|☄️|What is the powdery dust and broken rock on the Moon's surface called?|Regolith|Lava|Magma|Sandstone|It is so sharp it scratched the astronauts' suits and boots.
4|🔥|Why does a capsule coming back to Earth get so hot?|It squashes and rubs the air as it rushes in|The Sun shines on it|Its engines are on full|The sea is hot|The heat shield can reach well over 2,000 °C.
4|🏋️|Earth's gravity is about how many times stronger than the Moon's?|About 6 times|About 2 times|About 100 times|The same|That's why astronauts could bounce along so easily on the Moon.
5|🌒|Why does Earth hardly move across the sky when you stand on the Moon's near side?|The Moon always keeps the same face towards Earth|Earth stops spinning|The Moon has no sky|Earth is too far away to move|Earth only wobbles a little in the Moon's sky while it goes through phases.
5|🚀|What is a trans-lunar injection?|The rocket burn that sends a spacecraft from Earth orbit towards the Moon|A medicine astronauts take|Landing on the Moon|Docking with a space station|Apollo's third stage fired for about six minutes to do it.
5|🧊|Where on the Moon have scientists found signs of frozen water?|In dark craters near the poles|On the sunny equator|Inside Moon volcanoes|Nowhere at all|Some crater floors never see sunlight, so ice can last there for billions of years.
5|⚓|What is a docking port on a space station for?|Joining spacecraft together so crews can move between them|Parking cars|Catching meteors|Making electricity|The hatches open once the seal is tight and the air pressure matches.
5|🪂|Why does a capsule open small drogue parachutes before the big main ones?|To slow down and steady it first, so the main parachutes don't tear|To look pretty|To steer to the Moon|To make it go faster|Apollo used two drogues, then three main parachutes.
6|🌌|What is a Lagrange point?|A spot where the pulls of two big bodies balance so a spacecraft can keep its place|The highest mountain on the Moon|The middle of the Sun|The place where comets are born|The James Webb Space Telescope orbits near the second Sun–Earth Lagrange point.
6|🛰️|What does low Earth orbit mean?|Orbiting up to about 2,000 km above Earth|Flying just above the clouds|Orbiting the Moon|Any orbit around the Sun|The space station orbits at roughly 400 km.
6|🌕|What do most scientists think made the Moon?|A Mars-sized world crashing into the young Earth|It was a captured comet|It split off from the Sun|A volcano on Earth threw it up|This is called the giant impact idea.
6|↩️|Why did early Moon missions fly a free-return path?|If the engine failed, the Moon's gravity would swing the craft back to Earth|It is the shortest path|It avoids the Sun|It saves food|Apollo 13's crew got home safely by swinging around the Moon.
6|🌑|The "dark side of the Moon" is really its far side. Why is that name misleading?|The far side gets just as much sunlight; we just never see it from Earth|It glows at night|It is made of black rock|The Moon has no far side|A Soviet spacecraft first photographed the far side in 1959.
`,

  body: `
1|❤️|Which organ pumps blood around your body?|Heart|Lungs|Stomach|Brain|Your heart beats about 100,000 times a day.
1|🌬️|Which organs help you breathe?|Lungs|Kidneys|Heart|Liver|Your lungs take in oxygen from the air.
1|💭|Which organ do you think with?|Brain|Heart|Stomach|Bones|Your brain controls everything your body does.
1|👀|Which sense do you use your eyes for?|Sight|Hearing|Smell|Taste|Eyes turn light into signals for your brain.
1|👂|Which sense do your ears give you?|Hearing|Taste|Touch|Sight|Your ears also help you keep your balance.
1|🍦|You taste food with your ...|Tongue|Elbow|Teeth|Ears|Your tongue has thousands of taste buds.
1|🧍|What holds your body up and gives it shape?|Skeleton|Skin|Hair|Blood|Your skeleton is made of bones.
1|🦷|Children lose their baby teeth.|TRUE|FALSE|||Adult teeth grow in to take their place.
1|💪|What do your muscles help you do?|Move|See|Hear|Taste|Muscles pull on your bones to move you.
1|🖐️|How many fingers are on one hand, counting the thumb?|5|4|6|10|Your thumb helps you grip things.
2|🩸|What carries oxygen around your body?|Blood|Bones|Hair|Skin|Red blood cells carry oxygen from your lungs.
2|🍽️|Where does food go after you swallow it?|Stomach|Lungs|Heart|Brain|Your stomach mixes food with juices to break it down.
2|😁|What is the hardest thing in your body?|Tooth enamel|Bone|Fingernail|Hair|Enamel covers your teeth and protects them.
2|🧴|What is the body's largest organ?|Skin|Liver|Heart|Brain|Skin protects you and helps keep you at the right temperature.
2|💨|Which gas do we breathe in that our body needs?|Oxygen|Carbon dioxide|Helium|Smoke|We breathe out carbon dioxide.
2|💧|Drinking water helps keep your body working well.|TRUE|FALSE|||More than half of your body is water.
2|🦵|What lets your bones bend where they meet?|Joints|Teeth|Nails|Hair|Knees, elbows and shoulders are joints.
2|👃|Which sense does your nose give you?|Smell|Sight|Hearing|Touch|Smell also helps you taste your food.
2|😴|Why do we need sleep?|To rest and repair the body and brain|To make our hair grow|To stop breathing|Because the Sun goes down|Children need about 9 to 12 hours of sleep a night.
2|🥕|Which foods give you lots of vitamins?|Fruits and vegetables|Sweets|Fizzy drinks|Chips|Vitamins help your body grow and fight germs.
3|🦴|About how many bones does an adult have?|206|50|1,000|12|Babies have about 300 bones; some join together as they grow.
3|📐|What is the longest bone in your body?|Thigh bone (femur)|Arm bone|Rib|Backbone|The femur runs from your hip to your knee.
3|🫀|Which blood vessels carry blood away from the heart?|Arteries|Veins|Nerves|Tendons|Veins bring blood back to the heart.
3|🦠|What do white blood cells do?|Fight germs|Carry oxygen|Digest food|Build bones|They are your body's defenders.
3|⚡|What carries messages between your brain and your body?|Nerves|Muscles|Bones|Blood|Signals zip along your nerves very fast.
3|🍞|Where is most of your food absorbed into the blood?|Small intestine|Stomach|Mouth|Lungs|The small intestine is about 6 metres long.
3|🎈|What does the diaphragm help you do?|Breathe|Digest food|See|Walk|This dome-shaped muscle sits under your lungs.
3|🫘|What do the kidneys do?|Clean the blood and make urine|Pump blood|Store memories|Make sweat|You have two kidneys, each about the size of a fist.
3|🔢|How many chambers does the human heart have?|4|2|3|6|Two atria on top and two ventricles below.
3|🌡️|Normal body temperature is about 37 °C.|TRUE|FALSE|||That's about 98.6 °F.
4|🩹|Which part of the blood helps stop bleeding?|Platelets|Red blood cells|White blood cells|Water|Platelets clump together to form a clot.
4|🫁|In the lungs, oxygen passes into the blood through tiny air sacs called ...|Alveoli|Ventricles|Villi|Neurons|You have hundreds of millions of alveoli.
4|🏭|Where are blood cells made?|Bone marrow|Heart|Stomach|Skin|Marrow is the soft tissue inside bones.
4|🧈|Which organ makes bile to help digest fat?|Liver|Heart|Lungs|Kidneys|Bile is stored in the gallbladder.
4|🔬|What is the basic building block of all living things?|Cell|Organ|Bone|Muscle|You are made of trillions of cells.
4|🔗|What attaches muscles to bones?|Tendons|Ligaments|Nerves|Veins|Ligaments join bone to bone.
4|👁️|Which part of the eye controls how much light gets in?|Iris|Lens|Retina|Eyelash|The black hole in its middle is the pupil.
4|🍬|Which organ makes insulin to control blood sugar?|Pancreas|Liver|Heart|Spleen|Insulin helps cells take in sugar for energy.
4|💓|Your pulse is your heartbeat felt in an artery.|TRUE|FALSE|||Try feeling it on your wrist or neck.
4|🛡️|What helps your body fight a germ it has met before?|Antibodies|Bones|Saliva|Hair|Vaccines teach your body to make antibodies.
5|🧬|Which molecule carries your genetic instructions?|DNA|ATP|Glucose|Salt|DNA is shaped like a twisted ladder: a double helix.
5|🤸|Which part of the brain controls balance?|Cerebellum|Cerebrum|Spinal cord|Pituitary gland|It sits at the back of the brain, under the cerebrum.
5|🧠|What are nerve cells called?|Neurons|Nephrons|Alveoli|Platelets|Your brain has about 86 billion neurons.
5|👂|The smallest bone in your body is in your ...|Ear|Toe|Finger|Nose|The stirrup bone (stapes) is only about 3 mm long.
5|🔋|Which part of a cell releases energy from food?|Mitochondria|Nucleus|Cell membrane|Ribosome|Mitochondria are called the powerhouse of the cell.
5|🏥|Which blood type can be given to almost anyone?|O negative|AB positive|A positive|B negative|O negative is called the universal donor.
5|💦|About how much of the human body is water?|About 60%|About 10%|About 90%|About 30%|Babies have even more: about 75%.
5|🍚|Which enzyme in saliva starts breaking down starch?|Amylase|Pepsin|Insulin|Lipase|Digestion starts in your mouth.
5|💉|What do vaccines do?|Train the immune system to recognise a germ|Kill all the bacteria in the body|Replace old blood cells|Make bones stronger|They give protection without having to catch the disease.
5|🦴|The spinal cord is part of the central nervous system.|TRUE|FALSE|||The brain and spinal cord together make the central nervous system.
6|🧬|How many chromosomes are in a typical human body cell?|46|23|48|64|They come in 23 pairs: one of each pair from each parent.
6|💊|What do antibiotics treat?|Bacterial infections|Viral infections like colds|Broken bones|Allergies|Antibiotics don't work against viruses.
6|❤️|Which chamber of the heart pumps blood to the whole body?|Left ventricle|Right atrium|Right ventricle|Left atrium|Its wall is the thickest, strongest part of the heart.
6|😮‍💨|Which gas do you breathe out more of than you breathed in?|Carbon dioxide|Oxygen|Nitrogen|Hydrogen|Your cells make carbon dioxide as they release energy.
6|🍗|Which nutrient builds and repairs muscles?|Protein|Sugar|Fat|Water|Proteins are made of amino acids.
6|🔴|What does haemoglobin do?|Carries oxygen in red blood cells|Fights germs|Digests fats|Sends nerve signals|It contains iron, which helps make blood red.
6|👑|Which gland is often called the master gland?|Pituitary gland|Thyroid gland|Adrenal gland|Pancreas|Its hormones control many other glands.
6|🦿|What smooth tissue covers the ends of bones at the joints?|Cartilage|Enamel|Marrow|Tendon|Cartilage lets bones glide over each other.
6|🌡️|Which part of the brain acts like the body's thermostat?|Hypothalamus|Cerebellum|Occipital lobe|Spinal cord|It keeps your temperature close to 37 °C.
6|🌒|Rod cells in the eye help us see in dim light.|TRUE|FALSE|||Cone cells handle colour in bright light.
1|😴|Astronauts on the space station sleep in sleeping bags tied to the wall.|TRUE|FALSE|||Otherwise they would float around the cabin while they sleep.
1|🦴|Exercise helps keep your bones and muscles strong.|TRUE|FALSE|||Astronauts exercise about two hours every day in space.
1|🥕|What should astronauts eat to stay healthy?|Fruit, vegetables and other healthy food|Only sweets|Only crisps|Nothing at all|Good food gives astronauts the energy for hard work.
1|🫁|What do your lungs fill with when you breathe in?|Air|Water|Food|Blood|Each breath brings fresh oxygen into your body.
1|😎|Astronauts pull down dark visors to protect their ...|Eyes|Feet|Knees|Elbows|Sunlight in space is very bright and has harmful rays.
2|📏|Astronauts grow a little taller in space. Why?|Their spine stretches without gravity squashing it|They eat more|Space food has growing powder|Their shoes are thicker|They can gain up to about 5 cm, and shrink back on Earth.
2|🤢|Many astronauts feel sick during their first days in space. What causes it?|Their sense of balance gets confused without gravity|Bad food|Too much sleep|Cold air|It's called space sickness and usually passes in a few days.
2|🪥|Astronauts in space still brush their teeth. What do they do with the toothpaste?|Swallow it or spit it into a cloth|Spit it into the air|Leave it in their mouth|Throw it out of the window|Spit would float around the cabin!
2|🏃|When you run, your heart beats ...|Faster|Slower|Not at all|Backwards|Your muscles need more oxygen, so your heart pumps faster.
2|🌅|Why does the light on the space station change colour through the day?|To help the crew's body clocks know when to sleep|To make plants purple|To scare away aliens|To save the batteries|The crew sees about 16 sunrises a day, which confuses the body clock.
3|🦴|Why do astronauts' bones get weaker in space?|Without gravity, bones carry no load and lose minerals|They drink too much milk|The Sun dissolves them|Space food has no calcium|They can lose about 1% of their bone mass every month.
3|💪|Which muscles weaken fastest in space?|The leg and back muscles that normally hold us up|Eye muscles|Tongue muscles|Finger muscles|That's why astronauts run on treadmills, strapped down with harnesses.
3|👂|Which part of the inner ear senses balance and movement?|The vestibular system|The eardrum|The tonsils|The appendix|In space it can't feel which way is down, which confuses the brain.
3|😮|Why do astronauts' faces look puffy in space?|Body fluids shift up towards the head|They eat too much|The helmet squeezes them|They are always laughing|Their legs get thinner too: astronauts call it "puffy face, bird legs".
3|💦|If an astronaut gets too hot, what does the body do to cool down?|Sweats|Shivers|Sneezes|Hiccups|Spacesuits also have cool water flowing through tubes in special underwear.
4|☢️|Why do astronauts get more radiation in space than on Earth?|They are outside the protection of Earth's thick air and magnetic field|Space food is radioactive|Their suits glow|Stars are hot|Space agencies count every astronaut's radiation dose carefully.
4|👓|Some astronauts' eyesight changes on long missions. Scientists think this is caused by ...|Fluid shifting towards the head and pressing on the eyes|Too much reading|Looking at the Sun|Wearing helmets|Many astronauts carry adjustable glasses just in case.
4|🚶|After months in space, why do astronauts often need help to walk when they land?|Their balance and muscles must get used to gravity again|Their legs fell asleep|Their shoes shrank|The ship is still moving|It can take weeks for the body to fully recover.
4|🩸|What happens to the amount of fluid in astronauts' blood in space?|It goes down, because the body thinks there is too much fluid in the head|It doubles|It turns blue|It stays exactly the same|Back on Earth they may feel dizzy when they stand up.
4|🕒|The body clock that tells you when to sleep is called your ...|Circadian rhythm|Heart rate|Reflex|Metabolism|It runs on a cycle of about 24 hours.
5|☀️|Why do astronauts take vitamin D on the space station?|They get almost no sunlight on their skin to make it|It helps them float|It makes them taller|It replaces water|Vitamin D helps the body take in calcium for strong bones.
5|👯|NASA studied twin astronauts, one in space for a year and one on Earth, to learn ...|How long spaceflight changes the body|Which twin was taller|Whether twins think alike|How to clone astronauts|The NASA Twins Study followed Scott and Mark Kelly.
5|🫀|Why does the heart become slightly rounder in space?|It doesn't have to pump as hard against gravity|It shrinks from the cold|It grows extra chambers|It moves into the stomach|It goes back to its normal shape after returning to Earth.
5|🫧|What causes the "bends" (decompression sickness)?|Gas bubbles forming in the body when pressure drops too fast|Eating too fast|Bending over in space|Cold fingers|Astronauts breathe pure oxygen before spacewalks to prevent it.
5|🦠|Why are astronauts kept in quarantine before launch?|So they don't take germs into space, where getting sick is risky|To learn the rules|To lose weight|To grow beards|The first Moon crews were also quarantined after they came home.
6|🧠|Which part of the nervous system runs automatic jobs like your heartbeat and breathing rate?|The autonomic nervous system|The skeletal system|The optic nerve|The lymph system|It works without you having to think about it.
6|😵|Why is low oxygen (hypoxia) in a spacecraft dangerous even before the crew notices?|It can make people confused while they still feel fine|It makes people very alert|It causes loud noises|It only affects plants|Pilots and astronauts train to spot its early signs.
6|🔬|Which cells break down bone, and become more active in microgravity?|Osteoclasts|Osteoblasts|Neurons|Red blood cells|Osteoblasts build bone; in space the balance tips towards losing it.
6|💫|What is orthostatic intolerance, which is common after spaceflight?|Feeling dizzy or fainting when standing up|Hearing loss|Being unable to sleep|Losing your sense of taste|Blood pools in the legs before the body adjusts to gravity again.
6|🎈|Why must the air pressure in a spacecraft cabin stay high enough?|So oxygen can pass from the lungs into the blood|So the walls stay painted|To keep the food fresh|To make the radios work|At very low pressure, the lungs can't take up enough oxygen.
`,

  chemistry: `
1|💧|What are the three states of matter?|Solid, liquid, gas|Hot, warm, cold|Big, medium, small|Wood, metal, plastic|Water can be ice, water or steam.
1|🧊|Ice is water in which state?|Solid|Liquid|Gas|Plasma|Ice melts into liquid water when it warms up.
1|♨️|What happens to water when you boil it?|It turns into steam|It turns into ice|It turns into salt|Nothing at all|Steam is water as a gas.
1|🍋|Lemon juice tastes sour because it is ...|An acid|A metal|A gas|A sugar|Acids taste sour, but never taste anything you don't know is safe!
1|🧈|What happens to butter left in the hot sun?|It melts|It freezes|It turns to gas at once|It gets harder|Heat turns many solids into liquids.
1|🌬️|Air is a gas.|TRUE|FALSE|||You can't see air, but you can feel it move as wind.
1|🛶|Which of these floats on water?|Wood|A stone|An iron key|A coin|Wood is less dense than water.
1|🥛|Milk is a ...|Liquid|Solid|Gas|Metal|Liquids flow and take the shape of their container.
1|🥄|What happens to sugar stirred into warm water?|It dissolves|It turns into ice|It catches fire|It grows bigger|The sugar is still there: you can taste it.
1|🕯️|Fire needs air to keep burning.|TRUE|FALSE|||That's why putting a jar over a candle puts it out.
2|☀️|What do we call water slowly turning into a gas?|Evaporation|Freezing|Melting|Condensation|Puddles dry up by evaporation.
2|🥶|Water drops forming on a cold glass is called ...|Condensation|Evaporation|Melting|Boiling|Water vapour in the air cools and turns back into liquid.
2|❄️|At what temperature does water freeze?|0 °C|100 °C|50 °C|10 °C|That's 32 °F.
2|🫖|At what temperature does water boil at sea level?|100 °C|0 °C|50 °C|200 °C|That's 212 °F.
2|🔩|Which of these is a metal?|Iron|Wood|Glass|Rubber|Most metals are shiny and let electricity through.
2|🧪|What do we call a substance made of only one kind of atom?|Element|Mixture|Solution|Compound|There are 118 known elements.
2|🎈|Which gas makes party balloons float up?|Helium|Oxygen|Carbon dioxide|Steam|Helium is lighter than air.
2|🥤|Which gas makes fizzy drinks bubbly?|Carbon dioxide|Oxygen|Helium|Hydrogen|It's squeezed into the drink and fizzes out when you open it.
2|🍳|Cooking an egg is a change you can't undo.|TRUE|FALSE|||Heat changes the egg's proteins for good.
2|👕|Which of these is a natural material?|Cotton|Plastic|Nylon|Polyester|Cotton grows on plants.
3|⚛️|What is everything around us made of?|Atoms|Light|Electricity|Sound|Atoms are far too small to see, even with a normal microscope.
3|💧|What is the chemical formula for water?|H₂O|CO₂|O₂|NaCl|Two hydrogen atoms and one oxygen atom.
3|🧂|Table salt is made of sodium and ...|Chlorine|Oxygen|Iron|Carbon|Its chemical name is sodium chloride.
3|🥇|Which symbol stands for gold?|Au|Go|Gd|Ag|Au comes from aurum, the Latin word for gold.
3|🫧|What is the chemical symbol for oxygen?|O|Ox|Og|Om|Oxygen makes up about 21% of the air.
3|🌫️|Which gas makes up most of the air?|Nitrogen|Oxygen|Carbon dioxide|Helium|About 78% of the air is nitrogen.
3|🚲|What is rust?|Iron reacting with oxygen and water|Dirt stuck on metal|Melted iron|A kind of paint|Rusting is a slow chemical reaction.
3|🧼|What do we call a substance that cancels out an acid?|A base (alkali)|Salt water|An element|A gas|Soap and baking soda are bases.
3|⚗️|The pH of pure water is 7, which is neutral.|TRUE|FALSE|||Below 7 is acidic; above 7 is basic.
3|💎|Diamonds are made of which element?|Carbon|Iron|Silver|Oxygen|Pencil "lead" (graphite) is carbon too.
4|➖|Which part of an atom has a negative charge?|Electron|Proton|Neutron|Nucleus|Electrons whizz around the nucleus.
4|🎯|Which particles are in an atom's nucleus?|Protons and neutrons|Electrons only|Protons and electrons|Atoms and molecules|The nucleus holds almost all of the atom's mass.
4|🔢|An element's atomic number is its number of ...|Protons|Neutrons|Atoms|Molecules|Hydrogen is number 1: it has one proton.
4|🪶|What is the lightest element?|Hydrogen|Helium|Oxygen|Lithium|Hydrogen is the most common element in the Universe.
4|📊|What chart lists all the elements?|The periodic table|The food pyramid|The water cycle|A star map|Dmitri Mendeleev made an early version in 1869.
4|🌡️|Which metal is a liquid at room temperature?|Mercury|Iron|Gold|Aluminium|It was used in old thermometers.
4|🪙|What is the chemical symbol for silver?|Ag|Si|Sv|Sl|From argentum, the Latin word for silver.
4|🔗|What is a compound?|Two or more elements chemically joined|A single element|A mixture you can sieve apart|A kind of metal|Water and salt are compounds.
4|🌿|Plants take in carbon dioxide and give out oxygen.|TRUE|FALSE|||This happens during photosynthesis.
4|🕯️|What new substances form when a candle burns?|Carbon dioxide and water|Gold and silver|Helium|Salt|Burning wax reacts with oxygen from the air.
5|👑|Which gases are called noble gases because they hardly react?|Helium, neon and argon|Oxygen, nitrogen and chlorine|Hydrogen, carbon and sulfur|Sodium, potassium and calcium|They sit in the last column of the periodic table.
5|🧂|What is the chemical symbol for sodium?|Na|So|Sd|S|From natrium, its Latin name.
5|⏩|What is a catalyst?|A substance that speeds up a reaction without being used up|A substance that stops every reaction|A type of acid|A kind of atom|Enzymes are the body's catalysts.
5|🔥|A reaction that gives out heat is called ...|Exothermic|Endothermic|Neutral|Static|Burning is an exothermic reaction.
5|🧊|A reaction that takes in heat is called ...|Endothermic|Exothermic|Explosive|Magnetic|Instant cold packs use endothermic reactions.
5|⚖️|Isotopes of an element have different numbers of ...|Neutrons|Protons|Elements|Atoms|Carbon-14 has two more neutrons than carbon-12.
5|🤝|What do you get when an acid reacts with a base?|A salt and water|Pure gold|Only a gas|Oil|This is called neutralisation.
5|☢️|Which element is the fuel in most nuclear power stations?|Uranium|Iron|Carbon|Helium|Splitting uranium atoms releases a lot of energy.
5|📱|Which metal is in most rechargeable phone batteries?|Lithium|Lead|Gold|Mercury|Lithium is the lightest metal.
5|🔌|Metals conduct electricity well.|TRUE|FALSE|||That's why electric wires are made of copper.
6|🧮|How many elements are on the periodic table today?|118|92|100|150|The newest ones were named in 2016.
6|🤲|What kind of bond shares electrons between atoms?|Covalent bond|Ionic bond|Metallic bond|Magnetic bond|The atoms in a water molecule share electrons.
6|🧂|What kind of bond holds sodium chloride together?|Ionic|Covalent|Hydrogen|Metallic|Sodium hands an electron to chlorine, and the two attract.
6|🫧|What is the chemical formula for carbon dioxide?|CO₂|CO|C₂O|O₂|One carbon atom and two oxygen atoms.
6|🔢|In chemistry, what is a mole?|A fixed number of particles, about 6 × 10²³|A small animal|A type of acid|A unit of heat|That number is called Avogadro's number.
6|🧯|How does a carbon dioxide fire extinguisher work?|It pushes away the oxygen a fire needs|It soaks the fire with water|It cools the whole room|It makes the fire burn out faster|A fire needs fuel, heat and oxygen.
6|🌍|Which element makes up most of Earth's crust by mass?|Oxygen|Iron|Silicon|Aluminium|Oxygen is locked up in rocks and minerals.
6|🌟|Where were most elements heavier than iron made?|In exploding and colliding stars|In Earth's core|In volcanoes|In lightning|We are made of star stuff.
6|🍏|Which element do all living things contain?|Carbon|Gold|Neon|Uranium|Life on Earth is carbon-based.
6|⚡|Electrolysis uses electricity to split compounds apart.|TRUE|FALSE|||It can split water into hydrogen and oxygen.
1|💧|Astronauts need to drink ...|Water|Fuel|Sand|Paint|On the space station, water is cleaned and used again and again.
1|🍓|Freeze-dried space food has had what taken out of it?|Water|Sugar|Colour|Taste|Freeze-dried food is light and keeps for a long time.
1|🪨|The rocks brought back from the Moon are mostly ...|Grey stone and dust|Cheese|Gold|Ice cream|Apollo crews brought back 382 kg of Moon rock and soil.
1|🔥|A rocket burns fuel to make hot gas.|TRUE|FALSE|||The burning fuel turns into hot gases that rush out of the nozzle.
1|🧂|Sea water tastes ...|Salty|Sweet|Sour|Like nothing|The sea is salty because rivers wash salts from rocks into it.
2|🧊|Dry ice is frozen ...|Carbon dioxide|Water|Oxygen|Salt|Dry ice turns straight from a solid into a gas, without melting.
2|🔋|What gives a spacecraft electricity when the Sun is hidden?|Batteries|Rocks|Water bottles|Pillows|Batteries charge in sunlight and power the craft on the night side of its orbit.
2|🧯|Why are fires extra dangerous inside a spacecraft?|There's nowhere to escape and the air is limited|Space fire is cold|Fire can't burn in a spacecraft|Fires make spacecraft heavier|Astronauts train for fires and carry special extinguishers.
2|🥇|Spacesuit visors have a thin layer of gold to ...|Reflect the Sun's harsh light and heat|Look fancy|Make them heavier|Help astronauts see in the dark|Gold reflects heat very well.
2|🥫|Why is space food often sealed in pouches?|To keep it fresh and stop crumbs floating around|To make it taste of metal|So it can be thrown|To keep it hot forever|Floating crumbs could get into eyes or machines.
3|🧪|Many rocket upper stages burn a super-cold liquid form of which gas?|Hydrogen|Carbon dioxide|Helium|Neon|Liquid hydrogen is colder than −250 °C.
3|🧽|What does a spacecraft's CO₂ scrubber do?|Removes carbon dioxide from the air|Cleans the windows|Scrubs the astronauts|Makes fuel|On Apollo 13 the crew built a scrubber adapter from tape, card and plastic bags.
3|🌊|Why doesn't sea water freeze as easily as fresh water?|The salt in it lowers its freezing point|It is always moving too fast|Fish keep it warm|It has no water in it|Sea water freezes at about −2 °C.
3|🌋|The Moon's dark patches, called seas, are made of old cooled ...|Lava|Water|Grass|Ice|Early astronomers thought they were seas, so they're called maria.
3|⚗️|What is made when hydrogen burns with oxygen?|Water|Salt|Carbon dioxide|Sugar|That's why engines burning hydrogen give off a cloud of steam.
4|🪨|Moon soil is about 40% of which element by mass, locked up in its minerals?|Oxygen|Gold|Iron|Helium|Future Moon bases might bake oxygen out of the soil to breathe.
4|☁️|Liquid oxygen boils at about −183 °C. Why is there a white cloud around a fuelled rocket?|The cold boil-off chills the air so its water vapour condenses|The rocket is on fire|It is mixed with dust|It is radioactive|The white cloud is mostly tiny drops of water from the air, not smoke.
4|🛰️|Why is the outside of the space station white or covered in shiny foil?|To reflect sunlight and stop it overheating|So it's easy to see from Earth|To scare away meteors|White paint is the lightest|Shiny and white surfaces reflect most of the Sun's heat.
4|🚰|On the space station, astronauts' sweat and urine are cleaned and turned back into ...|Drinking water|Rocket fuel|Salt|Plastic|Astronauts joke: "Yesterday's coffee becomes tomorrow's coffee."
4|⚡|The space station makes oxygen by splitting water with electricity. Which other gas does that make?|Hydrogen|Nitrogen|Helium|Neon|Splitting water makes two parts hydrogen for every one part oxygen.
5|🧯|Why did NASA stop filling Apollo's cabin with pure oxygen on the launch pad after the Apollo 1 fire?|Pure oxygen makes things burn far too easily|Oxygen is too expensive|The astronauts didn't like the smell|It made the windows fog up|After the 1967 fire, the cabin used a nitrogen and oxygen mix on the pad.
5|💥|Hypergolic rocket fuels are special because they ...|Ignite by themselves the moment they touch|Never burn|Only burn underwater|Are made of ice|The Apollo lunar module's engines used them, so they would always light.
5|📝|Which balanced equation shows hydrogen burning in oxygen?|2H₂ + O₂ → 2H₂O|H₂ + O₂ → H₂O|H + O → HO₂|2H + O₂ → H₂O₂|Two hydrogen molecules and one oxygen molecule make two water molecules.
5|🌞|Helium-3, which might fuel future fusion reactors, collects in Moon soil because ...|The solar wind has dropped it there for billions of years|Moon volcanoes make it|Astronauts left it there|It rains down from Earth|Earth's air and magnetic field stop most of the solar wind reaching our ground.
5|🌊|About what percentage of sea water, by mass, is dissolved salt?|About 3.5%|About 50%|About 0.001%|About 20%|That's about 35 grams of salt in every litre.
6|🛡️|Many heat shields are made of materials that char and flake away. What is this process called?|Ablation|Evaporation|Filtration|Distillation|The burning layer carries the heat away from the capsule.
6|🔥|In a rocket engine, liquid hydrogen reacts with liquid oxygen. What kind of reaction is this?|Combustion, a strongly exothermic reaction|Neutralisation|Fermentation|Photosynthesis|It releases a huge amount of energy as very hot steam.
6|🧫|Apollo's air scrubbers used lithium hydroxide. How did it remove CO₂?|It reacted with it to form lithium carbonate and water|It froze it|It blew it outside|It turned it into oxygen|2LiOH + CO₂ → Li₂CO₃ + H₂O.
6|❄️|Why do the space station's outside cooling loops use ammonia instead of water?|Ammonia stays liquid at much colder temperatures|Ammonia is cheaper than water|Water is too heavy to launch|Ammonia smells nice|Water would freeze in the cold of space.
6|🔩|Why are many spacecraft parts made of titanium or aluminium alloys?|They are strong but light|They are magnetic|They glow in the dark|They are the cheapest metals|Every extra kilogram needs more fuel to launch.
`,

  physics: `
1|🧲|Which of these does a magnet pull?|An iron nail|A wooden spoon|A plastic cup|A sheet of paper|Magnets attract iron and steel.
1|⚽|What makes a ball fall back to the ground?|Gravity|Wind|Magnets|Light|Gravity pulls everything towards the Earth.
1|🌦️|What can you see when sunlight shines through rain?|A rainbow|A shadow|Lightning|Snow|Raindrops split white light into colours.
1|🎸|Sound is made when something ...|Vibrates|Freezes|Glows|Melts|Pluck a guitar string and watch it wiggle.
1|🌳|A shadow forms when something blocks ...|Light|Sound|Wind|Water|Light travels in straight lines.
1|🛒|Pushing and pulling are both kinds of ...|Force|Light|Sound|Heat|Forces make things start, stop or change direction.
1|🔦|Which of these gives off its own light?|A torch|A mirror|A spoon|The Moon|Mirrors and the Moon only bounce light.
1|🛝|A rough surface slows a sliding toy more than a smooth one.|TRUE|FALSE|||That's friction at work.
1|💡|What does a light bulb need to glow?|Electricity|Water|Sand|Wind|Electricity flows through the bulb.
1|🎈|Let go of a blown-up balloon and the air rushing out pushes it ...|Forwards|Nowhere|Into the ground|Backwards into the air|Rockets work the same way!
2|🪞|What does a mirror do to light?|Reflects it|Eats it|Makes it louder|Freezes it|Smooth, shiny surfaces reflect light well.
2|🚲|What force slows things down when they rub together?|Friction|Gravity|Magnetism|Lift|Bike brakes use friction.
2|🔌|Which material lets electricity flow through it?|Copper|Rubber|Wood|Plastic|Materials like this are called conductors.
2|🧤|Which material stops electricity?|Rubber|Copper|Iron|Silver|Insulators keep us safe from electric shocks.
2|🧭|What are the two ends of a magnet called?|North and south poles|Up and down|Left and right|Hot and cold|Opposite poles attract; like poles push apart.
2|🌩️|Lightning is a giant spark of electricity.|TRUE|FALSE|||A bolt of lightning is hotter than the surface of the Sun.
2|🔇|Sound cannot travel through ...|Empty space|Water|Air|Wood|Space is silent because there is no air to carry sound.
2|🌡️|What do we use to measure temperature?|A thermometer|A ruler|A clock|A scale|Temperature is measured in degrees.
2|🪂|What force slows down a parachute?|Air resistance|Magnetism|Electricity|Gravity|The big canopy pushes against lots of air.
2|🪶|Which is heavier: a kilogram of feathers or a kilogram of rocks?|They weigh the same|The rocks|The feathers|It depends on the day|A kilogram is a kilogram!
3|⚡|Which is faster: light or sound?|Light|Sound|They are the same|It depends on the weather|That's why you see lightning before you hear the thunder.
3|🔋|A battery stores energy as ...|Chemical energy|Sound energy|Light energy|Wind energy|It changes into electrical energy when you use it.
3|🍎|Which scientist is famous for the laws of motion and gravity?|Isaac Newton|Thomas Edison|Charles Darwin|Marie Curie|The story goes that a falling apple got him thinking.
3|🛑|An object at rest stays at rest unless a force acts on it.|TRUE|FALSE|||This is Newton's first law of motion.
3|🚀|Newton's third law: every action has an equal and opposite ...|Reaction|Speed|Weight|Colour|A rocket pushes gas down, and the gas pushes the rocket up.
3|📏|What unit is force measured in?|Newtons|Metres|Kilograms|Litres|It is named after Isaac Newton.
3|🔍|How does a magnifying glass make things look bigger?|Its lens bends light|It uses a mirror|It uses a magnet|It uses a battery|Bending light is called refraction.
3|☀️|Solar panels turn sunlight into ...|Electricity|Water|Wind|Sound|Solar power is a renewable source of energy.
3|🚢|Something floats if it is less dense than ...|The liquid it is in|The air above it|A piece of wood|A rock|Huge steel ships float because they are full of air.
3|🍲|Which spoon heats up fastest in hot soup?|Metal|Wooden|Plastic|They all heat up the same|Metals are good conductors of heat.
4|⚖️|What is the difference between mass and weight?|Mass is the amount of matter; weight is gravity's pull on it|They are exactly the same|Weight never changes|Mass changes on the Moon|On the Moon your mass is the same, but you weigh less.
4|🏎️|Speed equals distance divided by ...|Time|Mass|Force|Height|A car going 100 km in 2 hours averages 50 km per hour.
4|🔌|Which unit is electric current measured in?|Amps|Volts|Watts|Metres|It is named after André-Marie Ampère.
4|🎢|At the top of a roller coaster, the car has the most ...|Potential energy|Kinetic energy|Sound energy|Light energy|It turns into kinetic (moving) energy on the way down.
4|🌈|White light is a mix of all the colours.|TRUE|FALSE|||Isaac Newton showed this with a glass prism.
4|🔊|Sound travels fastest through ...|Solids|Gases|Empty space|Air|The particles in a solid are packed tightly together.
4|🪐|In space, a moving object with nothing to stop it will ...|Keep moving|Stop on its own|Fall down|Turn around|There is no air or friction to slow it down.
4|💡|In which circuit does one broken bulb make all the others go out?|Series circuit|Parallel circuit|Solar circuit|Magnetic circuit|A series circuit has only one path for the current.
4|🔥|Heat always flows from ...|Hotter things to colder things|Colder things to hotter things|The bottom to the top|Metals to air only|That's why an ice cube melts in your hand.
4|🎵|A higher-pitched sound has a higher ...|Frequency|Volume|Weight|Colour|Frequency is how many vibrations happen each second.
5|🏁|How fast does light travel?|About 300,000 km per second|About 300 km per hour|About 3,000 km per second|The same as sound|Light could go around the Earth over 7 times in one second.
5|🧮|Force equals mass times ...|Acceleration|Speed|Time|Distance|This is Newton's second law: F = m × a.
5|🔋|Voltage equals current times ...|Resistance|Power|Time|Energy|This is Ohm's law: V = I × R.
5|⚡|Which unit is energy measured in?|Joules|Newtons|Amps|Hertz|It is named after James Joule.
5|🌀|An electric motor turns electrical energy into ...|Movement|Light only|Sound only|Chemical energy|Motors are inside fans, toys and electric cars.
5|🧲|Moving a magnet in and out of a coil of wire makes ...|Electricity|Light|Ice|Sound|This is how power station generators work.
5|🥤|Light bending as it passes from air into water is called ...|Refraction|Reflection|Absorption|Evaporation|It makes a straw look bent in a glass of water.
5|🧑‍🚀|Astronauts on the space station float because they are falling around Earth.|TRUE|FALSE|||Gravity up there is still about 90% as strong as on the ground.
5|📡|Which of these is NOT an electromagnetic wave?|Sound|Radio waves|X-rays|Microwaves|Sound needs a material, like air, to travel through.
5|⚙️|What does a lever help you do?|Lift heavy loads with less force|Make light|Store electricity|Make sound|A see-saw is a kind of lever.
6|🧑‍🔬|Who came up with the theory of relativity?|Albert Einstein|Isaac Newton|Galileo Galilei|Nikola Tesla|His most famous equation is E = mc².
6|⚛️|In E = mc², what does c stand for?|The speed of light|Carbon|Charge|Current|A tiny bit of mass holds a huge amount of energy.
6|📈|Power is how fast work is done. Which unit is it measured in?|Watts|Joules|Volts|Newtons|1 watt is 1 joule every second.
6|🥶|What is absolute zero?|The coldest possible temperature, about −273 °C|The freezing point of water|The temperature of space near the Sun|0 °F|At absolute zero, particles have the least energy they can have.
6|🔭|Light from faraway galaxies is shifted towards red because ...|The Universe is expanding|Those galaxies are made of red rock|Dust paints them red|Telescope lenses are red|Edwin Hubble used this redshift to discover the expanding Universe.
6|☢️|What is the time for half of a radioactive sample to decay called?|Half-life|Full-life|Decay day|Light-year|Carbon-14's half-life is about 5,730 years.
6|🎯|Momentum equals mass times ...|Velocity|Acceleration|Force|Height|A heavy, fast object is hard to stop.
6|✨|What is the smallest packet of light called?|Photon|Electron|Proton|Neutron|Einstein won a Nobel Prize for explaining photons.
6|🛰️|A satellite stays in orbit because it moves sideways fast enough to keep missing the ground as it falls.|TRUE|FALSE|||That's what an orbit really is: endless falling.
6|🏠|Which kind of current comes from the mains sockets in most homes?|Alternating current (AC)|Direct current (DC)|Static current|Magnetic current|AC flips direction many times every second.
1|🪶|On the Moon, a feather and a hammer dropped together hit the ground at the same time.|TRUE|FALSE|||Astronaut David Scott tried it on Apollo 15: with no air, both fell together.
1|🏃|Astronauts on the Moon can jump higher than on Earth.|TRUE|FALSE|||The Moon's gravity is weaker, so every jump goes higher and lasts longer.
1|🍎|Which way do things fall on Earth?|Down|Up|Sideways|They float|Gravity pulls everything towards the middle of the Earth.
1|🔦|Which of these gives light in a dark spaceship?|A torch|A pillow|A spoon|A sock|A torch turns the electricity from its battery into light.
1|🚀|What pushes a rocket up into the sky?|Hot gas rushing out of its engine|Its wings|A giant spring|The wind|The gas goes down, so the rocket goes up.
2|🧭|A compass needle points north because Earth acts like a giant ...|Magnet|Battery|Mirror|Light bulb|Earth's hot, liquid iron core makes its magnetic field.
2|🧥|What keeps a spaceship warm in the dark shade of space?|Heaters and insulation|Open windows|Ice packs|Fans|Spacecraft are wrapped in shiny blankets that hold their heat in.
2|🪂|A parachute works only where there is ...|Air|Sunlight|Ice|Gravity of exactly zero|That's why landers can't use parachutes on the Moon.
2|⚖️|An astronaut's mass on the Moon is the same as on Earth.|TRUE|FALSE|||Mass is how much stuff you're made of; only your weight changes.
2|☀️|What do a spaceship's solar panels need to make electricity?|Sunlight|Rain|Wind|Sound|The space station's solar wings are about as wide as a football pitch.
3|🛞|Why did the Apollo Moon buggies have wire-mesh wheels instead of air-filled tyres?|Air tyres could burst or fail in the airless cold|Wire is softer|Mesh wheels are faster|It was cheaper|The rover's wheels were woven from steel wire.
3|🛟|Why does a capsule float when it lands in the sea?|It pushes aside enough water to hold up its weight|Water is magnetic|The parachute holds it up|It has wheels|Floating bags can also flip it the right way up if it lands upside down.
3|🎡|A spinning space station can make artificial gravity by ...|Pushing you outwards against the floor as it turns|Using giant magnets|Pulling with the Moon|Blowing air down|In the film Interstellar, the spaceship Endurance spins for this reason.
3|⏱️|If a spaceship travels 1,000 km every hour, how far does it go in 5 hours?|5,000 km|1,005 km|500 km|200 km|Distance equals speed multiplied by time.
3|🎯|To dock with a space station, a spacecraft should come in ...|Slowly, matching the station's speed and spin|As fast as it can|Backwards with its engines off|From the far side of the Earth|Real docking speeds are only a few centimetres per second.
4|🧮|A rocket's engine pushes up with 6,000 N and the rocket weighs 5,000 N. What is the leftover upward force?|1,000 N|11,000 N|5,000 N|0 N|A rocket only lifts off when its thrust beats its weight.
4|🪞|Apollo astronauts left mirrors on the Moon. What are they used for today?|Bouncing lasers back to measure the Moon's distance|Signalling aliens|Making the Moon brighter|Helping astronauts comb their hair|Laser timing shows the Moon drifts about 3.8 cm farther from Earth every year.
4|🌞|In space, the sunny side of a spacecraft gets very hot because ...|There's no air to carry the heat away|Space is full of fire|The Sun is closer in space|Metal makes heat|Engineers paint and wrap spacecraft to balance the heat.
4|💨|A satellite moves faster when its orbit is ...|Closer to Earth|Farther from Earth|Over the ocean|On the night side|The space station zooms at about 28,000 km/h; the far-away Moon moves much slower.
4|🌬️|What slows a returning capsule the most before its parachutes open?|Air resistance (drag) on its heat shield|Its brakes|The Moon's gravity|Sea water|Drag slows it from about 40,000 km/h to a few hundred km/h.
5|🔢|A spacecraft has a mass of 2,000 kg. What force gives it an acceleration of 3 m/s²?|6,000 N|667 N|2,003 N|1,500 N|Force equals mass times acceleration.
5|🌙|Gravity on the Moon is about 1.6 m/s². What does a 60 kg astronaut weigh there?|About 96 N|About 600 N|About 60 N|About 1.6 N|On Earth the same astronaut weighs about 590 N.
5|🔄|In a spinning space station, why do you feel heavier near the rim than near the middle?|The rim moves round a bigger circle faster, so it pushes harder|The middle is colder|The rim is closer to Earth|The air is thicker at the rim|Designers would put the bedrooms at the rim and the docking port at the hub.
5|📻|Radio travels at the speed of light. About how long does a message take from Earth to the Moon?|About 1.3 seconds|About 1 hour|About 8 minutes|No time at all|That's why Moon crews heard a short pause before every reply.
5|🪫|Why do rockets drop their empty stages on the way up?|Less mass means the same thrust gives more acceleration|To make room for passengers|So they can land faster|To keep them cold|Every kilogram you don't carry saves fuel.
6|🌀|To dock at the hub of a spinning space station, a spacecraft must turn at the same ...|Rate (angular speed)|Colour|Temperature|Height|Then the docking port looks still from the spacecraft, and the two can join.
6|♻️|Which idea explains why a rocket works in empty space?|Conservation of momentum: gas thrown back pushes the rocket forward|The rocket pushes against the air|Space pulls rockets along|Magnetism from the Sun|Rockets push against their own exhaust, not the air.
6|📐|Why must a returning capsule hit the atmosphere at just the right angle?|Too steep and it overheats; too shallow and it skips back out to space|So its parachutes face the Sun|To land near the equator|To save food|Apollo's re-entry corridor was only a couple of degrees wide.
6|🌊|Why is splashing down in water gentler than hitting the ground?|The water moves aside, spreading the stop over more time, so the force is smaller|Water is hotter than ground|The water pushes with magnets|Water is lighter than air|A smaller change of momentum per second means a smaller force.
6|🛰️|Why does a geostationary satellite stay above one spot on Earth?|It orbits once every 24 hours, as fast as Earth turns|It is tied to a tower|It has no engines|Earth's magnet holds it|Geostationary satellites orbit about 36,000 km above the equator.
`,

  logic: `
1|🔢|Count on: 2, 4, 6, 8 … what comes next?|10|9|12|7|The numbers go up by 2 each time.
1|🚀|You have 3 rockets and build 2 more. How many rockets do you have now?|5|4|6|1|3 + 2 = 5.
1|🎨|Red, blue, red, blue, red … which colour comes next?|Blue|Red|Green|Yellow|The two colours take turns.
1|🌙|Which number is bigger: 7 or 4?|7|4|They are the same|Neither|7 is 3 more than 4.
1|👨‍🚀|There are 5 astronauts. 2 go outside for a spacewalk. How many stay inside?|3|2|7|5|5 − 2 = 3.
1|🔺|How many sides does a triangle have?|3|4|5|6|"Tri" means three.
1|🧩|Which is the odd one out: apple, banana, rocket, pear?|Rocket|Apple|Banana|Pear|The others are all fruit.
1|⏰|If it is 3 o'clock now, what time will it be in 1 hour?|4 o'clock|2 o'clock|3 o'clock|5 o'clock|One hour later, the little hand moves on to the next number.
1|🪐|You see 4 planets, then 4 more come into view. How many planets do you see?|8|6|4|9|4 + 4 = 8, the same as the number of planets in our solar system!
1|⏬|Countdown: 10, 9, 8, 7 … what comes next?|6|5|8|11|Rocket countdowns go all the way down to zero: liftoff!
2|🖐️|5, 10, 15, 20 … what comes next?|25|30|21|22|Counting in fives.
2|🧮|A rocket has 4 fins. How many fins do 3 rockets have?|12|7|10|16|3 × 4 = 12.
2|🍪|An astronaut has 10 snacks and eats 2 each day. How many days will they last?|5|8|12|20|10 ÷ 2 = 5.
2|🟦|How many corners does a square have?|4|3|5|8|A square has 4 equal sides and 4 corners.
2|🥄|Which is the odd one out: Moon, Sun, star, spoon?|Spoon|Moon|Sun|Star|The others all shine in the sky.
2|📏|Tom is taller than Mia. Mia is taller than Sam. Who is the shortest?|Sam|Tom|Mia|They are all the same height|Tom is tallest, then Mia, then Sam.
2|⏳|A spacewalk starts at 2 o'clock and lasts 3 hours. When does it end?|5 o'clock|4 o'clock|6 o'clock|1 o'clock|2 + 3 = 5.
2|⚪|Which of these shapes has no corners?|Circle|Square|Triangle|Rectangle|A circle is one smooth curve.
2|🪖|Every astronaut outside wears a helmet. Zara is an astronaut outside, so Zara …|Is wearing a helmet|Has no helmet|Is asleep|Is on Earth|If a rule is true for everyone, it's true for each one.
2|✂️|What is half of 18?|9|8|6|36|Half means splitting into two equal parts.
3|✖️|1, 2, 4, 8, 16 … what comes next?|32|24|20|18|Each number is double the one before.
3|🚙|A Moon rover drives 12 km every hour. How far does it go in 4 hours?|48 km|16 km|36 km|52 km|12 × 4 = 48.
3|🔐|A hatch code is two digits that add up to 9 and multiply to 18. What are they?|3 and 6|4 and 5|2 and 7|1 and 8|3 + 6 = 9 and 3 × 6 = 18.
3|🧭|You face north and turn right. Which way are you facing now?|East|West|South|North|Turning right from north points you east.
3|🔁|Which number is missing? 3, 6, __, 12, 15|9|8|10|7|Counting in threes.
3|🌗|A Moon day lasts about 30 Earth days. About how many Earth days is half a Moon day?|15|60|10|20|30 ÷ 2 = 15.
3|🛰️|Satellite A is higher than B, and C is lower than B. Which satellite is the lowest?|C|A|B|They are all level|A is highest, then B, then C.
3|📦|If 4 boxes of fuel weigh 20 kg, how much does 1 box weigh?|5 kg|4 kg|16 kg|80 kg|20 ÷ 4 = 5.
3|📐|Draw one straight line from corner to corner across a square. How many triangles do you make?|2|1|3|4|The diagonal splits the square into two triangles.
3|🚨|Every red warning light means STOP. The light is red. What should you do?|Stop|Go faster|Ignore it|Open the hatch|Following a rule step by step is called deduction.
4|🐚|2, 3, 5, 8, 13 … what comes next?|21|18|26|20|Each number is the sum of the two before it (the Fibonacci sequence).
4|⛽|A fuel tank holds 400 litres when full. It is ¾ full. How much fuel is in it?|300 litres|100 litres|350 litres|250 litres|¾ of 400 = 300.
4|🔧|Each panel needs 3 bolts. You have 20 bolts. How many panels can you fully fix?|6|7|5|60|6 × 3 = 18, with 2 bolts left over.
4|🔀|The alarm always sounds if the red wire is cut. The alarm is silent. What do you know?|The red wire was not cut|The red wire was cut|The blue wire was cut|Both wires were cut|If A always causes B, and B didn't happen, then A didn't happen.
4|💯|What is 15% of 200?|30|15|20|35|10% is 20 and 5% is 10: together 30.
4|🪂|A capsule's parachutes open at 10:52 and it splashes down 7 minutes later. When is splashdown?|10:59|11:02|10:45|10:57|52 + 7 = 59.
4|🔣|Which number does not belong: 4, 9, 16, 20, 25?|20|9|16|25|The others are square numbers: 2², 3², 4² and 5².
4|🗺️|The station is 12 km ahead and you close 3 km every minute. How many minutes until you arrive?|4|3|9|36|12 ÷ 3 = 4.
4|🔤|In a code, each letter becomes the next one in the alphabet. What is HAL in code?|IBM|GBK|IAM|HBM|H → I, A → B, L → M.
4|🎒|A bag has 3 red and 1 blue Moon rock. You pick one without looking. Which colour are you more likely to get?|Red|Blue|Both are equally likely|Green|3 out of 4 rocks are red.
5|🟥|1, 4, 9, 16, 25 … what comes next?|36|30|35|49|These are square numbers: 6 × 6 = 36.
5|🗓️|A ship travels 384,000 km in 3 days. How far is that per day?|128,000 km|384 km|1,152,000 km|100,000 km|Apollo took about 3 days to reach the Moon.
5|🏋️|An astronaut weighs 600 N on Earth. Moon gravity is ⅙ as strong. What do they weigh on the Moon?|100 N|60 N|3,600 N|594 N|600 ÷ 6 = 100.
5|🎚️|Exactly one of three switches opens the hatch. Switch A doesn't, and switch C doesn't. Which one does?|B|A|C|None of them|Rule out the others, and what's left must be true.
5|🔄|You face east, turn 180°, then turn 90° to your right. Which way do you face now?|North|South|East|West|East turns to west after 180°, and a right turn from west faces north.
5|🔵|All Zorbs are Glims, and all Glims are blue. So all Zorbs are …|Blue|Red|Not Glims|Invisible|This kind of chain of reasoning is called a syllogism.
5|🔋|A heater uses a full battery in 6 hours at full power. At half power, about how long does the battery last?|12 hours|3 hours|6 hours|9 hours|Using energy half as fast makes it last twice as long.
5|🎡|A station spins once every 60 seconds. How many degrees does it turn each second?|6°|60°|1°|360°|360° ÷ 60 = 6° every second.
5|🔍|What is the next prime number after 13?|17|15|14|19|A prime can only be divided exactly by 1 and itself.
5|📅|A mission starts on a Monday. Day 1 is that Monday. What day of the week is day 8?|Monday|Tuesday|Sunday|Friday|Days repeat every 7, so day 8 is a Monday again.
6|📈|3, 6, 12, 24 … what is the 7th number in this pattern?|192|96|168|384|Keep doubling: 48, 96, 192.
6|🔥|An engine burns 250 kg of fuel per second for 2.5 minutes. How much fuel does it use?|37,500 kg|625 kg|6,250 kg|375,000 kg|2.5 minutes = 150 seconds, and 150 × 250 = 37,500.
6|🤥|Ana always tells the truth and Ben always lies. Ben says "I am Ana." Is that true?|No, it's a lie|Yes, it's true|It could be either|Ben is Ana|Everything a liar says is false.
6|📍|You drift 0.05 m sideways every second. How many seconds until you are 1 m off centre?|20|40|10|100|1 ÷ 0.05 = 20.
6|🪙|Two coins are tossed. What is the chance that both land heads?|1 in 4|1 in 2|1 in 3|1 in 8|HH, HT, TH and TT: only one of the four is both heads.
6|✏️|If 2x + 6 = 20, what is x?|7|13|14|10|2x = 14, so x = 7.
6|🧩|The modules are in this order: RADIO, OXYGEN, NAV, POWER, DOCK. Which module is between OXYGEN and POWER?|NAV|RADIO|DOCK|OXYGEN|NAV sits between OXYGEN and POWER.
6|📡|A radio signal takes about 1.3 s to reach the Moon. How long until you hear an instant reply?|About 2.6 s|About 1.3 s|About 0.65 s|About 13 s|There and back is twice the distance.
6|📊|What is the average of 4, 8 and 12?|8|24|6|12|(4 + 8 + 12) ÷ 3 = 8.
6|♾️|Which of these is the biggest number?|2¹⁰|10²|999|500|2¹⁰ = 1,024.
`,
};
