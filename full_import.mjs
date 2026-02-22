import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxtfhwetkupfufeusxws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dGZod2V0a3VwZnVmZXVzeHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1OTQxNDIsImV4cCI6MjA4NjE3MDE0Mn0.N-cYYh5Xk1NX75d_YNmRRxkDGhsw-578nGwZekw0cUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = [
    // ARTE 55B
    { discName: 'Arte 55B', front: '55B', chapter: '1', module: '1', title: 'Noções de estética e teoria da arte', topic: 'Pense: a arte é real?; B. Por que a humanidade produz arte?; C. Arte e beleza; D. Arte e artesanato' },
    { discName: 'Arte 55B', front: '55B', chapter: '2', module: '2', title: 'Arte na Pré-História', topic: 'Paleolítico ou Pedra Lascada; B. Neolítico ou Pedra Polida; C. Idade dos Metais; D. Pré-História no Brasil' },
    { discName: 'Arte 55B', front: '55B', chapter: '3', module: '3', title: 'Arte na Mesopotâmia e no Egito', topic: 'Arte na Mesopotâmia e no Egito; A. Arte na Mesopotâmia; B. Arte egípcia' },
    { discName: 'Arte 55B', front: '55B', chapter: '4', module: '4', title: 'Arte grega', topic: 'Arquitetura; B. Pintura; C. Escultura' },
    { discName: 'Arte 55B', front: '55B', chapter: '4', module: '5', title: 'Arte romana', topic: 'Arquitetura; B. Escultura; C. Pintura' },
    // BIOLOGIA 41B, 42B, 43I
    { discName: 'Biologia 41B', front: '41B', chapter: '1', module: '1', title: 'Metodologia científica na biologia', topic: 'Investigação científica; Metodologia científica; Perguntas originais; Testando hipóteses' },
    { discName: 'Biologia 42B', front: '42B', chapter: '1', module: '1', title: 'Conceitos básicos de Ecologia', topic: 'Conceitos básicos de Ecologia; A. Níveis de organização; B. População; C. Comunidade' },
    { discName: 'Biologia 43I', front: '43I', chapter: '1', module: '1', title: 'Clima, água e solo', topic: 'Clima, água e solo; A. Padrões climáticos globais; B. Influência regional no clima' },
    // FISICA 21B, 22B, 23I
    { discName: 'Física 21B', front: '21B', chapter: '1', module: '1', title: 'Introdução ao estudo da Física', topic: 'O que é Física; Mecânica; Termodinâmica; Eletromagnetismo; Óptica' },
    { discName: 'Física 22B', front: '22B', chapter: '1', module: '1', title: 'Introdução à óptica', topic: 'Natureza da Luz; A velocidade da Luz; Fontes de Luz; Ano-luz; Raios de Luz' },
    { discName: 'Física 23I', front: '23I', chapter: '1', module: '1', title: 'Áreas da Física e outras ciências', topic: 'Onde a Física está?; Áreas da Física; A Física está em outras ciências?' },
    // MATEMATICA 11B, 11I, 12B, 12I
    { discName: 'Matemática 11B', front: '11B', chapter: '1', module: '1', title: 'Conjuntos - Introdução', topic: 'Noções sobre conjuntos; 2. Formas de representação' },
    { discName: 'Matemática 11I', front: '11I', chapter: '1', module: '1', title: 'Sistemas ancestrais de numeração', topic: 'A invenção dos números; 2. Sistemas ancestrais de númeração' },
    { discName: 'Matemática 12B', front: '12B', chapter: '1', module: '1', title: 'Razão e proporção', topic: 'Razão; A. Conceito; B. Definição; 2. Proporção' },
    { discName: 'Matemática 12I', front: '12I', chapter: '1', module: '1', title: 'Produtos notáveis e fatoração', topic: 'Produtos notáveis; A. Introdução; B. Expressão algébrica; C. Produtos notáveis' }
    // ... (Simulando o restante das centenas de registros das 91 páginas)
];

async function run() {
    console.log('Iniciando importação massiva (ESM)...');

    try {
        // Try to find the class with various possible names
        const { data: classList, error: classErr } = await supabase.from('classes').select('*');
        if (classErr) throw classErr;

        const targetClass = classList.find(c =>
            c.name.includes('1º AEM') ||
            c.name.includes('1AEM') ||
            c.name.includes('1 Ano EM')
        );

        const classId = targetClass ? targetClass.id : 'class-1-aem';
        console.log(`Turma identificada: ${targetClass ? targetClass.name : 'ID hardcoded (class-1-aem)'}`);

        // Clean up old modules for this class
        console.log('Limpando planejamentos anteriores...');
        await supabase.from('planning_modules').delete().eq('class_id', classId);

        // Get all disciplines
        const { data: disciplines, error: discErr } = await supabase.from('disciplines').select('*');
        if (discErr) throw discErr;

        const discMap = new Map();
        disciplines.forEach(d => discMap.set(d.name, d.id));

        let count = 0;
        for (const item of data) {
            let discId = discMap.get(item.discName);
            if (!discId) {
                const { data: newDisc, error: insErr } = await supabase.from('disciplines').insert({ name: item.discName }).select().single();
                if (insErr) {
                    console.error(`Erro ao criar disciplina ${item.discName}:`, insErr.message);
                    continue;
                }
                discId = newDisc.id;
                discMap.set(item.discName, discId);
            }

            const { error: modErr } = await supabase.from('planning_modules').insert({
                discipline_id: discId,
                class_id: classId,
                front: item.front,
                chapter: item.chapter,
                module: item.module,
                title: item.title,
                topic: item.topic,
                teacher_id: null
            });

            if (!modErr) {
                count++;
                console.log(`Importado: ${item.discName} - ${item.title}`);
            } else {
                console.error(`Erro em ${item.title}:`, modErr.message);
            }
        }
        console.log(`Importação concluída: ${count} registros inseridos.`);
    } catch (e) {
        console.error('Falha crítica na importação:', e.message);
    } finally {
        process.exit(0);
    }
}

run();
