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
    title: 'Velocidade no Meteor',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #2e7d32 0%, #8bc34a 100%)',
    emoji: '🚀',
    text: 'Considerando g = 10 m/s² e desprezando atritos, qual a velocidade real de Pedro ao chegar na piscina do Meteor (40m)?',
    options: ["20 m/s (72 km/h)", "28,3 m/s (102 km/h)", "40 m/s (144 km/h)", "10 m/s (36 km/h)", "14,1 m/s (51 km/h)"],
    correct: 1,
    correctAnswer: 1,
    hint: "🧠 Lembre-se da fórmula da conservação de energia: v = √(2gh). Faça 2·10·40 = 800.",
    res: "v = √(2 · 10 · 40) = √800 ≈ 28,3 m/s"
  },
  {
    id: 2,
    title: 'Looping da Mariana',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'Ajude Mariana a calcular a velocidade mínima no topo do loop (raio de 9 metros e g = 10 m/s²).',
    options: ["9 m/s", "9,5 m/s", "√90 m/s ≈ 9,49 m/s", "10 m/s", "15 m/s"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 v = √(g·R). Multiplique 10 por 9. Qual número multiplicado por ele mesmo dá 90?",
    res: "v = √(10 · 9) = √90 ≈ 9,49 m/s"
  },
  {
    id: 3,
    title: 'Vortex e Inércia',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, por que a bóia com maior massa (200kg) sobe mais alto na parede do funil que a leve (100kg)?',
    options: ["Força centrípeta é maior", "A inércia é maior, tendendo a manter a trajetória", "A velocidade da bóia pesada é maior", "O atrito é menor", "A gravidade age mais forte"],
    correct: 1,
    correctAnswer: 1,
    hint: "🌪️ Inércia é a resistência à mudança de trajetória. Quem tem mais massa resiste mais a 'entrar na curva'.",
    res: "A inércia maior faz com que a bóia mais massiva tenda a manter sua trajetória de subida por mais tempo."
  },
  {
    id: 4,
    title: 'Corrida no R4lly',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
    emoji: '🏁',
    text: 'No R4lly, a reclamação do irmão mais leve de que o mais pesado ganhou por causa da massa faz sentido?',
    options: ["Sim, peso maior gera aceleração maior", "Não, a aceleração independe da massa", "Sim, a inércia ajuda o mais pesado", "Não, o atrito é maior para o pesado", "Depende do ângulo da pista"],
    correct: 1,
    correctAnswer: 1,
    hint: "🏁 Lembre-se: a = g·(senθ − µ·cosθ). Existe 'm' (massa) nesta fórmula?",
    res: "Na ausência de outros fatores, a aceleração em um plano inclinado não depende da massa do objeto."
  },
  {
    id: 5,
    title: 'Giro no Space Bowl',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)',
    emoji: '🥣',
    text: 'No Space Bowl, o banhista gira mais rápido ao se aproximar do centro. Qual princípio explica isso?',
    options: ["Conservação da energia cinética", "Conservação do momento linear", "Conservação do momento angular", "Lei da gravitação universal", "Princípio de Arquimedes"],
    correct: 2,
    correctAnswer: 2,
    hint: "🥣 Pense na patinadora que encolhe os braços para girar mais rápido.",
    res: "Ao diminuir o raio, a velocidade angular aumenta para conservar o momento angular (L = mvr)."
  },
  {
    id: 6,
    title: 'Ondas na Wave Lagoon',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
    emoji: '🌊',
    text: 'Na Wave Lagoon, a boia sobe e desce com a onda, mas não sai do lugar. Por quê?',
    options: ["A onda empurra a boia", "A onda transporta energia, mas não matéria", "A água se move junto com a onda", "A boia se moveu, mas a água não", "Depende da altura da onda"],
    correct: 1,
    correctAnswer: 1,
    hint: "🌊 Waves (ondas) transmitem energia. A água em si apenas oscila.",
    res: "Ondas mecânicas transportam energia através do meio, mas não transportam a matéria em si."
  },
  {
    id: 7,
    title: 'Balde da Ilha do Cascão',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
    emoji: '🪣',
    text: 'Por que aumentar a distância do eixo no balde da Ilha do Cascão faz ele tombar mais fácil?',
    options: ["Aumenta a força da água", "Aumenta a massa do balde", "Aumenta o braço de alavanca (Torque)", "Diminui o centro de massa", "Aumenta a gravidade"],
    correct: 2,
    correctAnswer: 2,
    hint: "🪣 Torque = Força × distância. Mais distância = mais giro.",
    res: "O torque é o produto da força pela distância ao eixo (braço de alavanca). Maior distância facilita a rotação."
  },
  {
    id: 8,
    title: 'Curvas no Twister',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
    emoji: '🐍',
    text: 'No Twister, se um banhista dobra a velocidade em uma curva, o que acontece com a força lateral?',
    options: ["Permanece a mesma", "O dobro", "O triplo", "Quatro vezes maior", "A metade"],
    correct: 3,
    correctAnswer: 3,
    hint: "🐍 Fc = m·v²/R. Se a velocidade (v) dobra, v² aumenta quanto?",
    res: "A força centrípeta é proporcional ao quadrado da velocidade. 2² = 4 vezes maior."
  },
  {
    id: 9,
    title: 'Comparação de Tobogãs',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
    emoji: '🎢',
    text: 'Dois tobogãs de mesma altura (30m) com inclinações diferentes. Quem chega com maior velocidade na piscina?',
    options: ["O mais íngreme", "O mais suave", "Ambos com a mesma velocidade", "O mais íngreme, pois acelera mais", "O mais suave, pois acelera por mais tempo"],
    correct: 2,
    correctAnswer: 2,
    hint: "🎢 Sem atrito, a velocidade final depende apenas da altura (h).",
    res: "Pela conservação de energia, mgh = mv²/2. A velocidade final √(2gh) só depende da altura."
  },
  {
    id: 10,
    title: 'Segurança no Loop',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'Qual a velocidade mínima para completar um loop de raio 10m com segurança? (g=10m/s²)',
    options: ["5 m/s", "8 m/s", "10 m/s", "12 m/s", "14 m/s"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 v = √(g·R) = √(10·10).",
    res: "v = √(10 · 10) = 10 m/s."
  },
  {
    id: 11,
    title: 'Vortex e Velocidade',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, se a velocidade da bóia cai pela metade, o que ocorre com a força centrípeta?',
    options: ["A mesma", "A metade", "Um quarto da original", "O dobro", "Quatro vezes maior"],
    correct: 2,
    correctAnswer: 2,
    hint: "🌪️ Se v vira v/2, o quadrado disso (v²) fica dividido por 4.",
    res: "Fc ∝ v². Se v' = v/2, então Fc' = (1/2)² · Fc = 1/4 Fc."
  },
  {
    id: 12,
    title: 'Frequência da Wave Lagoon',
    type: 'multiple-choice',
    unit: 'Hz',
    init: '',
    banner: 'linear-gradient(135deg, #0d47a1 0%, #2196f3 100%)',
    emoji: '🌊',
    text: 'Na Wave Lagoon, 10 ondas passam por um ponto a cada 20 segundos. Qual a frequência?',
    options: ["0,25 Hz", "0,5 Hz", "1 Hz", "2 Hz", "5 Hz"],
    correct: 1,
    correctAnswer: 1,
    hint: "🌊 Frequência = Ondas ÷ Tempo.",
    res: "f = 10 / 20 = 0,5 Hz."
  },
  {
    id: 13,
    title: 'Torque no Balde',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #e65100 0%, #ff9800 100%)',
    emoji: '🪣',
    text: 'Um balde tomba com torque de 800 N·m. Se a força é 400N e a distância 2m, ele tomba?',
    options: ["Sim, pois τ = 800 N·m", "Sim, pois τ = 400 N·m", "Não, pois τ = 200 N·m", "Não, pois τ = 600 N·m", "Sim, pois τ = 1000 N·m"],
    correct: 0,
    correctAnswer: 0,
    hint: "🪣 Torque = 400N × 2m.",
    res: "τ = 400N · 2m = 800 N·m. Como atinge o limite, ele tomba."
  },
  {
    id: 14,
    title: 'Altura no Meteor',
    type: 'multiple-choice',
    unit: 'm',
    init: '',
    banner: 'linear-gradient(135deg, #2e7d32 0%, #8bc34a 100%)',
    emoji: '🚀',
    text: 'No Meteor, um banhista atinge 20 m/s ao final. De que altura ele caiu?',
    options: ["10 m", "20 m", "30 m", "40 m", "50 m"],
    correct: 1,
    correctAnswer: 1,
    hint: "🚀 v² = 2gh -> 400 = 20h.",
    res: "h = v² / 2g = 400 / 20 = 20 m."
  },
  {
    id: 15,
    title: 'Raio do Looping',
    type: 'multiple-choice',
    unit: 'm',
    init: '',
    banner: 'linear-gradient(135deg, #1b5e20 0%, #4caf50 100%)',
    emoji: '🔄',
    text: 'No Looping, a velocidade mínima no topo é 8 m/s. Qual o raio do loop?',
    options: ["4,8 m", "5,2 m", "6,4 m", "7,2 m", "8,0 m"],
    correct: 2,
    correctAnswer: 2,
    hint: "🔄 8 = √(10·R) -> 64 = 10R.",
    res: "R = v² / g = 8² / 10 = 6,4 m."
  },
  {
    id: 16,
    title: 'Massa no Vortex',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #33691e 0%, #8bc34a 100%)',
    emoji: '🌪️',
    text: 'No Vortex, se a massa da bóia dobrar (mais pessoas), a força centrípeta:',
    options: ["Aumenta na mesma proporção", "Diminui na mesma proporção", "Permanece igual", "Aumenta com o quadrado da massa", "Depende do ângulo"],
    correct: 0,
    correctAnswer: 0,
    hint: "Fc = m·v²/R. Massa e Força são diretamente proporcionais.",
    res: "Fc ∝ m. Se a massa dobra e a velocidade/raio são mantidos, a força dobra."
  },
  {
    id: 17,
    title: 'Aceleração no R4lly',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #004d40 0%, #009688 100%)',
    emoji: '🏁',
    text: 'No R4lly, se o atrito for zero (pista de gelo), a aceleração depende de:',
    options: ["Apenas g", "Apenas senθ", "Apenas cosθ", "g·senθ", "g·cosθ"],
    correct: 3,
    correctAnswer: 3,
    hint: "🏁 Sem atrito (µ=0), sobra apenas a componente do peso na direção do movimento.",
    res: "A componente da aceleração da gravidade ao longo do plano inclinado é a = g sen θ."
  },
  {
    id: 18,
    title: 'Velocidade no Space Bowl',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #01579b 0%, #0288d1 100%)',
    emoji: '🥣',
    text: 'No Space Bowl, se o raio cai para 1/3 do original, a velocidade:',
    options: ["Cai para 1/3", "Fica 3 vezes maior", "Fica √3 vezes maior", "Fica 9 vezes maior", "Permanece a mesma"],
    correct: 1,
    correctAnswer: 1,
    hint: "🥣 Momento Angular = m·v·R. Se R diminui, v precisa aumentar para compensar.",
    res: "v₁R₁ = v₂R₂. Se R₂ = R₁/3, então v₂ = 3v₁."
  },
  {
    id: 19,
    title: 'Força no Twister',
    type: 'multiple-choice',
    unit: '',
    init: '',
    banner: 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
    emoji: '🐍',
    text: 'No Twister, se o raio da curva cai pela metade e a velocidade é mantida, a força lateral:',
    options: ["Dobra", "Reduz à metade", "Quadruplica", "Permanece igual", "Aumenta √2 vezes"],
    correct: 0,
    correctAnswer: 0,
    hint: "🐍 F é inversamente proporcional ao raio. Raio menor = Curva mais 'fechada' e forte.",
    res: "Fc = mv²/R. Se R vira R/2, Fc vira 2Fc."
  },
  {
    id: 20,
    title: 'Altura e Velocidade',
    type: 'multiple-choice',
    unit: 'm/s',
    init: '',
    banner: 'linear-gradient(135deg, #4a148c 0%, #9c27b0 100%)',
    emoji: '🎢',
    text: 'Um banhista cai de \'h\' e atinge \'v\'. Se ele cair de uma altura 4 vezes maior (4h), qual a nova velocidade?',
    options: ["v", "2v", "4v", "√2 v", "8v"],
    correct: 1,
    correctAnswer: 1,
    hint: "🎢 v = √(2gh). Se h quadruplica, tiramos a raiz de 4, que é 2.",
    res: "v' = √(2g · 4h) = 2 · √(2gh) = 2v."
  }
];
