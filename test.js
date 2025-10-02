const supabaseUrl = 'https://cmdincdnmnemjjzkbmns.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGluY2RubW5lbWpqemtibW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTY2MTgsImV4cCI6MjA3NDg3MjYxOH0.Rk1Ll6HhzEhA5Mz93sesIqUD1etsHqoTgswDcFZtABo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);


// Récuperer les voies
async function getVoies() {
  let { data: voies, error } = await supabase
    .from('voies')
    .select('*');
  if (error) console.error(error);
  else console.log(voies);
  return voies;
}

// Récupérer les avis
async function getAvis(voieId) {
  let { data: avis, error } = await supabase
    .from('avis')
    .select('*')
    .eq('voie_id', voieId)
    .order('date', { ascending: false });
  if (error) console.error(error);
  else console.log(avis);
  return avis;
}

//Ajouter un avis

async function addAvis(voieId, utilisateur, note, commentaire) {
  const { data, error } = await supabase
    .from('avis')
    .insert([{ voie_id: voieId, utilisateur, note, commentaire }]);
  if (error) console.error(error);
  else console.log("Avis ajouté !");
}

//Mettre à jour le staut d'une voie
async function updateStatut(voieId, nouveauStatut) {
  const { data, error } = await supabase
    .from('voies')
    .update({ statut: nouveauStatut })
    .eq('id', voieId);
  if (error) console.error(error);
  else console.log("Statut mis à jour !");
}


