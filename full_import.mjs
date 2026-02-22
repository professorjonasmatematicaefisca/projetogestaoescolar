import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxtfhwetkupfufeusxws.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im1yay00MzAyZWMxYjY3MGY0OGE5OGFkNjFkYWRlNGEyM2JlNyJ9.eyJpc3MiOiJodHRwczovL29pZGMudmVyY2VsLmNvbS9qb25hcy1wcm9qZWN0cy0xOTFlMDI3ZCIsInN1YiI6Im93bmVyOmpvbmFzLXByb2plY3RzLTE5MWUwMjdkOnByb2plY3Q6cHJvamV0b2dlc3Rhb2VzY29sYXI6ZW52aXJvbm1lbnQ6ZGV2ZWxvcG1lbnQiLCJhdWQiOiJodHRwczovL3ZlcmNlbC5jb20vam9uYXMtcHJvamVjdHMtMTkxZTAyN2QiLCJvd25lciI6ImpvbmFzLXByb2plY3RzLTE5MWUwMjdkIiwib3duZXJfaWQiOiJ0ZWFtX0htbEdFTnJhMzFCR2lUdVc2NmJIV2c2NCIsInByb2plY3QiOiJwcm9qZXRvZ2VzdGFvZXNjb2xhciIsInByb2plY3RfaWQiOiJwcmpfOG9maVVlWWlla3hBUjNzVWN5anVYb3ZncEw3NyIsImVudmlyb25tZW50IjoiZGV2ZWxvcG1lbnQiLCJwbGFuIjoiaG9iYnkiLCJ1c2VyX2lkIjoiQ3lPOVc2TGlEbkZnaXMzOXJ2eTFJdDJUIiwibmJmIjoxNzcwNzU1MjgwLCJpYXQiOjE3NzA3NTUyODAsImV4cCI6MTc3MDc5ODQ4MH0.KNTSGG1R2_KwsKFkTj_w2iGSTbWkehs5GArWonPJC8h7cfHIha9yX_uLPBBskWsXI8To5uyJdsLEjpJXogRtxdvEsdEuVslf72RjHRZtQ2AaQuUO0KyAt78vtTUWbGuXEJcllJbuC14pBa8jsQP6EqQtzu5x0RHDJFghYYIaBGLR8ITz9Tiz1qYQHGXQ7h8MgN0EHy6j3twhIq9yNSrdg0g8l8zSVLEW2K5vn-NmcCW77su_4ID-1OqmMcrTZHpS7SmdkJORbOmdhAG-n-BzzTed5QMwk7ol-m-6tRQe-CkDZVGppb3PJp67v3VFNErljSCteuYSkg9qJDLZrKvwSA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const data = [
    // ARTE 55B
    { discipline: 'Arte', front: '55B', chapter: '8', module: '11', title: 'Arte barroca', topic: 'Pintura; Escultura; Arquitetura' },
    { discipline: 'Arte', front: '55B', chapter: '8', module: '12', title: 'Arte barroca brasileira e rococó', topic: 'Barroco brasileiro; B. Rococó' },
    { discipline: 'Arte', front: '55B', chapter: '9', module: '13', title: 'Neoclassicismo', topic: 'Pintura; B. Escultura; C. Arquitetura; D. Neoclassicismo no Brasil' },
    // BIOLOGIA 41B - Page 4/5
    { discipline: 'Biologia', front: '41B', chapter: '2', module: '7', title: 'Água e sais minerais', topic: 'Água; B. Sais minerais' },
    { discipline: 'Biologia', front: '41B', chapter: '2', module: '8', title: 'Carboidratos', topic: 'Monossacarídeos; B. Oligossacarídeos; C. Polissacarídeos' },
    { discipline: 'Biologia', front: '41B', chapter: '3', module: '13', title: 'Célula procariótica', topic: 'Célula: unidade fundamental; 2. Célula procariótica' },
    { discipline: 'Biologia', front: '41B', chapter: '3', module: '17', title: 'Células procarióticas e células eucarióticas', topic: 'Modelo de célula animal; B. Modelo de célula vegetal' },
    // FISICA 21B - Page 16/17
    { discipline: 'Física', front: '21B', chapter: '1', module: '1', title: 'Introdução ao estudo da Física', topic: 'O que é Física; Mecânica; Termodinâmica; Eletromagnetismo; Óptica' },
    { discipline: 'Física', front: '21B', chapter: '2', module: '3', title: 'Conceitos básicos de Cinemática', topic: 'Referencial; Movimento e repouso; Trajetória; Deslocamento escalar' },
    { discipline: 'Física', front: '21B', chapter: '2', module: '5', title: 'MRU - Função horária dos espaços', topic: 'Função horária dos espaços; MRU – Classificação' },
    // MATEMATICA 11B - Page 57/58
    { discipline: 'Matemática', front: '11B', chapter: '1', module: '1', title: 'Conjuntos - Introdução', topic: 'Noções sobre conjuntos; 2. Formas de representação' },
    { discipline: 'Matemática', front: '11B', chapter: '2', module: '7', title: 'Conjuntos numéricos: Naturais, Inteiros e Racionais', topic: 'Conjunto dos números naturais (N); Z; Q' },
    { discipline: 'Matemática', front: '11B', chapter: '3', module: '10', title: 'Porcentagem - Definição e transações comerciais', topic: 'Porcentagem ou percentagem; Custo, lucro e venda' }
];

async function run() {
    console.log('Iniciando importação massiva (ESM)...');

    // Get class ID for 1º AEM
    const { data: classes } = await supabase.from('classes').select('id').eq('name', '1º AEM');
    const classId = classes && classes[0] ? classes[0].id : null;

    if (!classId) {
        console.error('Turma 1º AEM não encontrada.');
        return;
    }

    // Get all disciplines
    const { data: disciplines } = await supabase.from('disciplines').select('*');
    const discMap = new Map();
    disciplines.forEach(d => discMap.set(d.name, d.id));

    let count = 0;
    for (const item of data) {
        let discId = discMap.get(item.discipline);
        if (!discId) {
            const { data: newDisc } = await supabase.from('disciplines').insert({ name: item.discipline }).select().single();
            if (newDisc) {
                discId = newDisc.id;
                discMap.set(item.discipline, discId);
            }
        }

        if (discId) {
            const { error } = await supabase.from('planning_modules').insert({
                discipline_id: discId,
                class_id: classId,
                front: item.front,
                chapter: item.chapter,
                module: item.module,
                title: item.title,
                topic: item.topic,
                teacher_id: null
            });

            if (!error) {
                count++;
                console.log(`Importado: ${item.discipline} - ${item.title}`);
            } else {
                console.error(`Erro em ${item.title}:`, error.message);
            }
        }
    }
    console.log(`Importação concluída: ${count} registros inseridos.`);
    process.exit(0);
}

run();
