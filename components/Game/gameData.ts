export type QuestionType =
  | 'combo-match'
  | 'combo-3'
  | 'slider'
  | 'stepper'
  | 'keypad'
  | 'dial-lock'
  | 'stack'
  | 'hold'
  | 'checkboxes'
  | 'tilt'
  | 'number'
  | 'equation-builder'
  | 'fraction-combo'
  | 'multiple-choice';

export interface ComboOption {
  id: string;
  val: string;
}

export interface Question {
  id: number;
  title: string;
  type: QuestionType;
  unit: string;
  init: string | number;
  banner: string;
  emoji: string;
  text: string;
  correct: string | number;
  hint: string;
  res: string;
  // combo-match and combo-3
  optsA?: ComboOption[];
  optsB?: ComboOption[];
  optsC?: ComboOption[];
  // dial-lock
  digits?: number;
  // equation-builder
  pieces?: string[];
  // multiple-choice
  options?: string[];
  correctAnswer?: number;
}

export const questions: Question[] = [
  {
    id: 1,
    title: 'O Recordista do Meteor',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #2e7d32 0%, #8bc34a 100%)',
    emoji: '🚀',
    text: 'Pedro é um youtuber radical e foi desafiado a descer no Meteor, o tobogã mais alto do parque. Ele gravou tudo e postou com o título: "DESCI DE 40 METROS EM QUEDA PRATICAMENTE LIVRE! FUI A 100 km/h?". Nos comentários, um engenheiro escreveu: "Pedro, 100 km/h seria ≈ 27,8 m/s. Pela Física, sua velocidade real foi menor."\n\nPergunta: Considerando g = 10 m/s² e desprezando atritos, qual a velocidade real de Pedro ao chegar na piscina?',
    options: ["20 m/s (72 km/h)", "28,3 m/s (102 km/h)", "40 m/s (144 km/h)", "10 m/s (36 km/h)", "14,1 m/s (51 km/h)"],
    correct: 1,
    correctAnswer: 1,
    hint: "🧠 Lembre-se da fórmula da conservação de energia: v = √(2gh). Não precisa de calculadora, faça 2·10·40 = 800. Qual a raiz quadrada de 800?",
    res: "v = √(2·10·40) = √800 ≈ 28,3 m/s."
  },
  {
    id: 2,
    title: 'O Medo do Looping',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'Mariana está na fila do Looping e ouve o salva-vidas explicar: "Para completar o loop com segurança, a velocidade no ponto mais alto precisa ser no mínimo √(g·R)". Ela pergunta: "Se o raio do loop fosse 9 metros e g = 10 m/s², qual seria essa velocidade?"\n\nPergunta: Ajude Mariana a calcular a velocidade mínima no topo do loop.',
    options: ["9 m/s", "9,5 m/s", "√90 m/s ≈ 9,49 m/s", "10 m/s", "15 m/s"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 v = √(g·R). Multiplique 10 por 9, dá 90. Agora pense: qual número multiplicado por ele mesmo dá 90? Não é 9 (81) nem 10 (100).",
    res: "v = √(g·R) = √(10·9) = √90 ≈ 9,49 m/s."
  },
  {
    id: 3,
    title: 'A Bóia no Vortex',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, duas bóias idênticas (mesma massa) entram no funil com a mesma velocidade. Uma delas está com 2 adultos (200 kg) e a outra com 2 crianças (100 kg). Os adultos sobem mais alto na parede do funil.\n\nPergunta: Por que a bóia com maior massa sobe mais alto?',
    options: ["Porque a força centrípeta é maior na bóia mais pesada.", "Porque a inércia é maior, então a bóia tende a manter a trajetória retilínea.", "Porque a velocidade da bóia pesada é maior.", "Porque o atrito é menor na bóia pesada.", "Porque a gravidade age mais forte em corpos pesados."],
    correct: 1,
    correctAnswer: 1,
    hint: "🌪️ Inércia é a resistência à mudança de trajetória. Quem tem mais massa resiste mais a \"entrar na curva\".",
    res: "A inércia maior faz com que a bóia mais massiva tenda a manter sua trajetória de subida por mais tempo."
  },
  {
    id: 4,
    title: 'A Corrida do R4lly',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
    emoji: '🏁',
    text: 'No R4lly, dois irmãos apostam corrida em pistas paralelas com a mesma inclinação. O irmão mais leve (50 kg) perde para o mais pesado (80 kg). Ele reclama: \"Você ganhou porque é mais pesado!\"\n\nPergunta: A reclamação do irmão mais leve faz sentido fisicamente?',
    options: ["Sim, porque a força peso é maior, então a aceleração é maior.", "Não, porque a aceleração independe da massa (a = g·senθ − µ·g·cosθ).", "Sim, porque a inércia ajuda o mais pesado.", "Não, porque o atrito é maior para o mais pesado.", "Depende do ângulo da pista."],
    correct: 1,
    correctAnswer: 1,
    hint: "🏁 Lembre-se da fórmula da aceleração: a = g·(senθ − µ·cosθ). Tem massa nessa fórmula?",
    res: "Pela fórmula, a aceleração depende apenas da gravidade, do ângulo e do atrito, e não da massa."
  },
  {
    id: 5,
    title: 'O Mistério do Space Bowl',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)',
    emoji: '🥣',
    text: 'No Space Bowl, um banhista começa girando na borda da tigela (raio grande) e, conforme desce, vai se aproximando do centro (raio pequeno). Ele percebe que começa a girar muito mais rápido.\n\nPergunta: Esse fenômeno é explicado por qual princípio físico?',
    options: ["Conservação da energia cinética", "Conservação do momento linear", "Conservação do momento angular", "Lei da gravitação universal", "Princípio de Arquimedes"],
    correct: 2,
    correctAnswer: 2,
    hint: "🥣 Quando uma patinadora gira e encolhe os braços, ela gira mais rápido. Que grandeza física se conserva nesse movimento?",
    res: "Pelo princípio de conservação do momento angular (L=mvr), se o raio 'r' diminui, a velocidade 'v' aumenta."
  },
  {
    id: 6,
    title: 'A Onda Traiçoeira',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
    emoji: '🌊',
    text: 'Na Wave Lagoon, uma boia está flutuando. Passa uma onda e a boia sobe e desce, mas volta para o mesmo lugar. Uma criança pergunta: \"A onda trouxe a boia até aqui?\" O salva-vidas explica corretamente:\n\nPergunta: Qual explicação está correta?',
    options: ["Sim, a onda empurrou a boia junto com a água.", "Não, a onda transporta energia, mas não transporta matéria.", "Sim, porque a água se move junto com a onda.", "Não, a boia se moveu, mas a água não.", "Depende da altura da onda."],
    correct: 1,
    correctAnswer: 1,
    hint: "🌊 Onda do mar: a água sobe e desce, mas o surfista precisa remar para pegar a onda. A onda não carrega a água.",
    res: "Ondas mecânicas são perturbações que transportam energia através de um meio sem transportar matéria."
  },
  {
    id: 7,
    title: 'O Balde da Ilha do Cascão',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
    emoji: '🪣',
    text: 'Na Ilha do Cascão, o balde gigante enche de água e, quando o centro de massa se desloca o suficiente, ele tomba. Um funcionário sugere: \"Se a gente aumentar a distância do eixo, o balde vai tombar mais fácil.\"\n\nPergunta: Por que essa sugestão faz sentido fisicamente?',
    options: ["Porque aumenta a força da água.", "Porque aumenta a massa do balde.", "Porque aumenta o braço de alavanca, aumentando o torque.", "Porque diminui o centro de massa.", "Porque aumenta a gravidade."],
    correct: 2,
    correctAnswer: 2,
    hint: "🪣 Torque = Força × distância do eixo. Quanto maior a distância, maior o...",
    res: "O torque é o produto da força pela distância (braço). Mais braço = mais torque para a mesma força."
  },
  {
    id: 8,
    title: 'A Curva do Twister',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
    emoji: '🐍',
    text: 'No Twister, um banhista de 60 kg faz uma curva com raio de 5 m a 10 m/s. Ele sente uma força forte o empurrando contra a parede. Se ele fizer a mesma curva com o dobro da velocidade, o que acontece com a força?\n\nPergunta: A força lateral será:',
    options: ["A mesma", "O dobro", "O triplo", "Quatro vezes maior", "A metade"],
    correct: 3,
    correctAnswer: 3,
    hint: "🐍 Força centrípeta = m·v²/R. Se v dobra, v² quadruplica. E a força?",
    res: "Como a velocidade está ao quadrado na fórmula da força centrípeta, dobrar a velocidade quadruplica a força."
  },
  {
    id: 9,
    title: 'O Enigma da Altura',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
    emoji: '🎢',
    text: 'Dois tobogãs, Meteor A e Meteor B, têm a mesma altura (30 m), mas inclinações diferentes. O Meteor A é mais íngreme (75°) e o Meteor B é mais suave (45°). João desce no A e Maria no B.\n\nPergunta: Quem chega com maior velocidade na piscina? (Despreze atritos)',
    options: ["João, porque a inclinação é maior", "Maria, porque a descida é mais longa", "Ambos chegam com a mesma velocidade", "João, porque ele acelera mais rápido", "Maria, porque ela tem mais tempo para acelerar"],
    correct: 2,
    correctAnswer: 2,
    hint: "🎢 A velocidade final depende apenas da altura (conservação de energia), não da inclinação.",
    res: "Sem atritos, a energia potencial mgh se converte totalmente em cinética mv²/2. v = √(2gh)."
  },
  {
    id: 10,
    title: 'O Perigo do Loop',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'No Looping, se a velocidade no topo for menor que a velocidade crítica (√(g·R)), o banhista pode cair. Um engenheiro projetou um loop com raio de 10 m (g = 10 m/s²).\n\nPergunta: Qual a velocidade mínima para completar o loop com segurança?',
    options: ["5 m/s", "8 m/s", "10 m/s", "12 m/s", "14 m/s"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 v = √(g·R) = √(10·10) = √100 = ?",
    res: "v = √(10·10) = 10 m/s."
  },
  {
    id: 11,
    title: 'O Paradoxo do Vortex',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, a força centrípeta é dada por Fc = m·v²/R. Se a velocidade da bóia for reduzida à metade, o que acontece com a força?\n\nPergunta: A nova força será:',
    options: ["A mesma", "A metade", "Um quarto da original", "O dobro", "Quatro vezes maior"],
    correct: 2,
    correctAnswer: 2,
    hint: "🌪️ Fc depende do quadrado da velocidade. Se v vira v/2, v² vira (v/2)² = v²/4.",
    res: "A força centrípeta é diretamente proporcional ao quadrado da velocidade. Reduzir v pela metade divide Fc por 4."
  },
  {
    id: 12,
    title: 'A Frequência da Onda',
    type: 'multiple-choice',
    unit: 'Hz',
    init: '',
    banner: 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
    emoji: '🌊',
    text: 'Na Wave Lagoon, um salva-vidas observa que 10 ondas passam por um ponto a cada 20 segundos.\n\nPergunta: Qual a frequência das ondas?',
    options: ["0,25 Hz", "0,5 Hz", "1 Hz", "2 Hz", "5 Hz"],
    correct: 1,
    correctAnswer: 1,
    hint: "🌊 Frequência = número de ondas por segundo. Se são 10 ondas em 20 segundos, quantas são por segundo?",
    res: "f = n/t = 10/20 = 0,5 Hz."
  },
  {
    id: 13,
    title: 'O Torque do Balde',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
    emoji: '🪣',
    text: 'Na Ilha do Cascão, o balde recebe água até que o torque atinja 800 N·m. A força da água é 400 N e a distância do eixo é 2 m.\n\nPergunta: O balde vai tombar nessa situação? (Considere ângulo de 90°)',
    options: ["Sim, pois τ = 800 N·m", "Sim, pois τ = 400 N·m", "Não, pois τ = 200 N·m", "Não, pois τ = 600 N·m", "Sim, pois τ = 1000 N·m"],
    correct: 0,
    correctAnswer: 0,
    hint: "🪣 τ = F·d·senθ = 400·2·1 = 800 N·m. Exatamente o necessário.",
    res: "τ = 400N · 2m = 800 N·m. Como atinge o valor limite, ele tomba."
  },
  {
    id: 14,
    title: 'A Queda no Meteor',
    type: 'multiple-choice',
    unit: 'm',
    init: '',
    banner: 'linear-gradient(135deg, #2e7d32 0%, #8bc34a 100%)',
    emoji: '🚀',
    text: 'No Meteor, um banhista atinge a velocidade de 20 m/s ao final da queda. (g = 10 m/s²)\n\nPergunta: De que altura ele caiu?',
    options: ["10 m", "20 m", "30 m", "40 m", "50 m"],
    correct: 1,
    correctAnswer: 1,
    hint: "🎢 v² = 2gh → 400 = 20h → h = ?",
    res: "h = v² / 2g = 400 / 20 = 20 m."
  },
  {
    id: 15,
    title: 'O Raio do Loop',
    type: 'multiple-choice',
    unit: 'm',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'No Looping, a velocidade mínima no topo é 8 m/s. (g = 10 m/s²)\n\nPergunta: Qual o raio do loop?',
    options: ["4,8 m", "5,2 m", "6,4 m", "7,2 m", "8,0 m"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 v = √(g·R) → 8 = √(10·R) → 64 = 10R → R = ?",
    res: "R = v²/g = 64/10 = 6,4 m."
  },
  {
    id: 16,
    title: 'A Inércia no Vortex',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, se a massa da bóia aumentar (mais pessoas), mas a velocidade e o raio forem mantidos, a força centrípeta:\n\nPergunta: O que acontece com a força centrípeta?',
    options: ["Aumenta na mesma proporção da massa", "Diminui na mesma proporção da massa", "Permanece igual", "Aumenta com o quadrado da massa", "Depende do ângulo do funil"],
    correct: 0,
    correctAnswer: 0,
    hint: "🌪️ Fc = m·v²/R. Se m dobra, Fc...",
    res: "A força centrípeta é diretamente proporcional à massa m."
  },
  {
    id: 17,
    title: 'O Atrito no R4lly',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
    emoji: '🏁',
    text: 'No R4lly, se o coeficiente de atrito for zero, a aceleração depende apenas de:\n\nPergunta: Qual componente define a aceleração?',
    options: ["g", "senθ", "cosθ", "g·senθ", "g·cosθ"],
    correct: 3,
    correctAnswer: 3,
    hint: "🏁 Com µ = 0, a fórmula fica a = g·senθ.",
    res: "Em um plano inclinado sem atrito, a = g sen θ."
  },
  {
    id: 18,
    title: 'A Velocidade no Space Bowl',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)',
    emoji: '🥣',
    text: 'No Space Bowl, o momento angular é conservado. Se o raio for reduzido a 1/3 do original, a velocidade:\n\nPergunta: A nova velocidade será:',
    options: ["1/3 da original", "3 vezes maior", "√3 vezes maior", "9 vezes maior", "A mesma"],
    correct: 1,
    correctAnswer: 1,
    hint: "🥣 L = m·v·R constante. Se R vira R/3, v precisa...",
    res: "mv₁R₁ = mv₂R₂. Se R₂ = R₁/3, então v₂ = 3v₁."
  },
  {
    id: 19,
    title: 'A Força no Twister',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
    emoji: '🐍',
    text: 'No Twister, se o raio da curva for reduzido à metade, mas a velocidade for mantida, a força lateral:\n\nPergunta: O que acontece com a força?',
    options: ["Dobra", "Reduz à metade", "Quadruplica", "Permanece igual", "Aumenta √2 vezes"],
    correct: 0,
    correctAnswer: 0,
    hint: "🐍 F ∝ 1/R. Se R cai pela metade, F...",
    res: "Fc = mv²/R. Se o denominador R cai pela metade, o valor de Fc dobra."
  },
  {
    id: 20,
    title: 'O Enigma Final',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
    emoji: '🎢',
    text: 'Um banhista desce no Meteor (altura h) e atinge velocidade v. Se ele descer de uma altura 4h, qual será sua nova velocidade? (Despreze atritos)\n\nPergunta: A nova velocidade será:',
    options: ["v", "2v", "4v", "√2 v", "8v"],
    correct: 1,
    correctAnswer: 1,
    hint: "🎢 v ∝ √h. Se h quadruplica, v...",
    res: "v = √(2gh). Se h' = 4h, v' = √(2g·4h) = 2√(2gh) = 2v."
  }
];
