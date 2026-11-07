export const customerErrorMessage=code=>({
 NAME_ALREADY_EXISTS:'Ya existe ese nombre. Selecciona el cliente guardado o registra una identificación fiscal distinta para otra persona. Ambos registros deben tener identificación.',
 HOMONYM_CONFIRMATION_REQUIRED:'Existe el mismo nombre con otra identificación. Confirma que es otra persona antes de guardar.',
 PHONE_ALREADY_EXISTS:'Ese teléfono ya pertenece a un cliente. Búscalo y selecciónalo.',
 TAX_ID_ALREADY_EXISTS:'Esa identificación fiscal ya pertenece a un cliente. Búscalo y selecciónalo.',
 CUSTOMER_INACTIVE:'Este cliente fue eliminado de la lista activa. Selecciona otro cliente.',
 NAME_REQUIRED:'Escribe el nombre del cliente.',
}[code]||'No se pudo guardar el cliente. Revisa los datos y vuelve a intentarlo.');
