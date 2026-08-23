// Link-urile demo folosite azi, hardcodate in HTML pe tot site-ul — devin
// valoarea initiala per familie in consilieri_linkuri; familia le poate
// suprascrie oricand, din Memorie, fara redeploy.
export const DEFAULT_CONSILIERI_LINKURI: Record<string, string> = {
  advix: 'https://claude.ai/chat/2f6c6eca-73ac-431f-8828-016c80add51c',
  adviz: 'https://claude.ai/chat/78837e6a-6141-4155-a468-8effa4b4edf0',
  verix: 'https://claude.ai/chat/f70cd809-e6d5-49d3-a339-873ba8207bff',
  vivix: 'https://claude.ai/chat/9870482c-bbaa-481f-84de-35539b289f6f',
};

// clone_replacement_requests.role_category foloseste denumirile de domeniu
// (conta/juridic/audit/rezervari_simulari), aceleasi cu core.clones si
// categories — numele de brand (advix/adviz/verix/vivix) sunt doar UI.
export const ROL_LA_DOMENIU: Record<string, string> = {
  advix: 'conta',
  adviz: 'juridic',
  verix: 'audit',
  vivix: 'rezervari_simulari',
};
