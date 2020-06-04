import {Request, Response} from 'express';
import knex from '../database/connection';

class PointsController {
  async create (request: Request, response: Response) {
    // pego os dados inseridos pelo usuário
    const {
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
      items
    } = request.body;
  
    const trx = await knex.transaction();
  
    // Insiro na tabela points os dados referentes a essa tabela, salvando na variável insertedIds 
    // o ID do meu point criado
    const insertedIds = await trx('points').insert({
      image: 'image-fake',
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf
    });
  
    // Percorro todos os items que o usuário digitou e vinculo o ID do point em cada um
    const pointItems = items.map((item_id: number) => {
      return {
        item_id,
        point_id: insertedIds[0],
      };
    });
  
    // Insiro os dados de id item e id point na tb_point_items
    await trx('point_items').insert(pointItems);
  
    return response.json({ success: true });
  }
}

export default PointsController;